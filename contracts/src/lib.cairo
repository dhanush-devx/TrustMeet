use starknet::ContractAddress;

#[derive(Drop, Serde, starknet::Store, Clone)]
pub struct MeetupData {
    pub creator: ContractAddress,
    pub counterpart: ContractAddress,
    pub lat: u64,           // (lat + 90.0) * 1_000_000 to keep positive
    pub lng: u64,           // (lng + 180.0) * 1_000_000 to keep positive
    pub meetup_time: u64,   // unix timestamp
    pub stake_amount: u256,
    pub status: u8,         // 0=pending_join, 1=active, 2=finalized
    pub creator_checked_in: bool,
    pub counterpart_checked_in: bool,
    pub title: felt252,
}

#[starknet::interface]
pub trait ITrustMeet<TContractState> {
    fn create_meetup(
        ref self: TContractState,
        title: felt252,
        lat: u64,
        lng: u64,
        meetup_time: u64,
        stake_amount: u256,
        counterpart: ContractAddress,
    ) -> u64;

    fn join_meetup(ref self: TContractState, meetup_id: u64);

    fn checkin(ref self: TContractState, meetup_id: u64, lat: u64, lng: u64);

    fn finalize_meetup(ref self: TContractState, meetup_id: u64);

    fn get_meetup(self: @TContractState, meetup_id: u64) -> MeetupData;

    fn get_meetup_count(self: @TContractState) -> u64;

    fn get_user_meetups(self: @TContractState, user: ContractAddress) -> Array<u64>;
}

#[starknet::contract]
pub mod TrustMeet {
    use super::{ITrustMeet, MeetupData};
    use starknet::{ContractAddress, get_caller_address, get_block_timestamp, get_contract_address};
    use starknet::storage::{
        StoragePointerReadAccess, StoragePointerWriteAccess, StoragePathEntry, Map, Vec, VecTrait,
        MutableVecTrait,
    };
    // Inline ERC20 interface — no external dependency needed
    #[starknet::interface]
    trait IERC20<TState> {
        fn transfer(ref self: TState, recipient: ContractAddress, amount: u256) -> bool;
        fn transfer_from(ref self: TState, sender: ContractAddress, recipient: ContractAddress, amount: u256) -> bool;
        fn approve(ref self: TState, spender: ContractAddress, amount: u256) -> bool;
        fn balance_of(self: @TState, account: ContractAddress) -> u256;
        fn allowance(self: @TState, owner: ContractAddress, spender: ContractAddress) -> u256;
    }

    // STRK token on Sepolia testnet
    const STRK_ADDRESS: felt252 =
        0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d;

    // 30 minutes check-in window (in seconds)
    const CHECKIN_WINDOW: u64 = 1800;

    // Location tolerance: 0.01 degree ≈ ~1km radius (stored as * 1_000_000)
    const LOCATION_TOLERANCE: u64 = 10_000;

    #[storage]
    struct Storage {
        meetup_count: u64,
        meetups: Map<u64, MeetupData>,
        strk_token: ContractAddress,
        // Map user -> list of meetup ids they're part of
        user_meetup_ids: Map<ContractAddress, Vec<u64>>,
    }

    #[event]
    #[derive(Drop, starknet::Event)]
    pub enum Event {
        MeetupCreated: MeetupCreated,
        MeetupJoined: MeetupJoined,
        CheckedIn: CheckedIn,
        MeetupFinalized: MeetupFinalized,
    }

    #[derive(Drop, starknet::Event)]
    pub struct MeetupCreated {
        #[key]
        pub meetup_id: u64,
        pub creator: ContractAddress,
        pub counterpart: ContractAddress,
        pub stake_amount: u256,
        pub meetup_time: u64,
    }

    #[derive(Drop, starknet::Event)]
    pub struct MeetupJoined {
        #[key]
        pub meetup_id: u64,
        pub participant: ContractAddress,
    }

    #[derive(Drop, starknet::Event)]
    pub struct CheckedIn {
        #[key]
        pub meetup_id: u64,
        pub participant: ContractAddress,
    }

    #[derive(Drop, starknet::Event)]
    pub struct MeetupFinalized {
        #[key]
        pub meetup_id: u64,
        pub both_attended: bool,
        pub creator_attended: bool,
        pub counterpart_attended: bool,
    }

    #[constructor]
    fn constructor(ref self: ContractState) {
        let strk: ContractAddress = STRK_ADDRESS.try_into().unwrap();
        self.strk_token.write(strk);
        self.meetup_count.write(0);
    }

    #[abi(embed_v0)]
    impl TrustMeetImpl of ITrustMeet<ContractState> {
        fn create_meetup(
            ref self: ContractState,
            title: felt252,
            lat: u64,
            lng: u64,
            meetup_time: u64,
            stake_amount: u256,
            counterpart: ContractAddress,
        ) -> u64 {
            let caller = get_caller_address();
            assert(stake_amount > 0_u256, 'Stake must be > 0');
            assert(counterpart != caller, 'Cannot meetup with yourself');
            assert(meetup_time > get_block_timestamp(), 'Meetup must be in the future');

            // Transfer stake from creator to contract
            let strk = IERC20Dispatcher { contract_address: self.strk_token.read() };
            let success = strk.transfer_from(caller, get_contract_address(), stake_amount);
            assert(success, 'Stake transfer failed');

            let meetup_id = self.meetup_count.read() + 1;
            self.meetup_count.write(meetup_id);

            let meetup = MeetupData {
                creator: caller,
                counterpart,
                lat,
                lng,
                meetup_time,
                stake_amount,
                status: 0,
                creator_checked_in: false,
                counterpart_checked_in: false,
                title,
            };

            self.meetups.entry(meetup_id).write(meetup);

            // Track meetup for both users
            self.user_meetup_ids.entry(caller).append().write(meetup_id);
            self.user_meetup_ids.entry(counterpart).append().write(meetup_id);

            self
                .emit(
                    MeetupCreated {
                        meetup_id, creator: caller, counterpart, stake_amount, meetup_time,
                    },
                );

            meetup_id
        }

        fn join_meetup(ref self: ContractState, meetup_id: u64) {
            let caller = get_caller_address();
            let mut meetup = self.meetups.entry(meetup_id).read();

            assert(meetup.counterpart == caller, 'Not invited to this meetup');
            assert(meetup.status == 0, 'Meetup already joined or done');
            assert(meetup.meetup_time > get_block_timestamp(), 'Meetup time has passed');

            // Transfer stake from counterpart to contract
            let strk = IERC20Dispatcher { contract_address: self.strk_token.read() };
            let success = strk.transfer_from(caller, get_contract_address(), meetup.stake_amount);
            assert(success, 'Stake transfer failed');

            meetup.status = 1; // active - both staked
            self.meetups.entry(meetup_id).write(meetup);

            self.emit(MeetupJoined { meetup_id, participant: caller });
        }

        fn checkin(ref self: ContractState, meetup_id: u64, lat: u64, lng: u64) {
            let caller = get_caller_address();
            let mut meetup = self.meetups.entry(meetup_id).read();
            let now = get_block_timestamp();

            assert(meetup.status == 1, 'Meetup not active');

            // Check within the time window
            let window_start = if meetup.meetup_time > CHECKIN_WINDOW {
                meetup.meetup_time - CHECKIN_WINDOW
            } else {
                0_u64
            };
            let window_end = meetup.meetup_time + CHECKIN_WINDOW;
            assert(now >= window_start && now <= window_end, 'Outside checkin window');

            // Verify location within tolerance
            let lat_diff = if lat > meetup.lat {
                lat - meetup.lat
            } else {
                meetup.lat - lat
            };
            let lng_diff = if lng > meetup.lng {
                lng - meetup.lng
            } else {
                meetup.lng - lng
            };
            assert(lat_diff <= LOCATION_TOLERANCE && lng_diff <= LOCATION_TOLERANCE, 'Not at meetup location');

            if caller == meetup.creator {
                assert(!meetup.creator_checked_in, 'Already checked in');
                meetup.creator_checked_in = true;
            } else if caller == meetup.counterpart {
                assert(!meetup.counterpart_checked_in, 'Already checked in');
                meetup.counterpart_checked_in = true;
            } else {
                assert(false, 'Not a participant');
            }

            self.meetups.entry(meetup_id).write(meetup);
            self.emit(CheckedIn { meetup_id, participant: caller });
        }

        fn finalize_meetup(ref self: ContractState, meetup_id: u64) {
            let mut meetup = self.meetups.entry(meetup_id).read();
            let now = get_block_timestamp();

            assert(meetup.status == 1, 'Meetup not active');
            assert(now > meetup.meetup_time + CHECKIN_WINDOW, 'Checkin window not closed yet');

            let strk = IERC20Dispatcher { contract_address: self.strk_token.read() };
            let total = meetup.stake_amount * 2_u256;
            let creator_in = meetup.creator_checked_in;
            let counterpart_in = meetup.counterpart_checked_in;

            if creator_in && counterpart_in {
                // Both showed up — full refund
                strk.transfer(meetup.creator, meetup.stake_amount);
                strk.transfer(meetup.counterpart, meetup.stake_amount);
            } else if creator_in {
                // Only creator showed — creator gets both stakes
                strk.transfer(meetup.creator, total);
            } else if counterpart_in {
                // Only counterpart showed — counterpart gets both stakes
                strk.transfer(meetup.counterpart, total);
            } else {
                // Nobody showed — refund both (no penalty for mutual no-show)
                strk.transfer(meetup.creator, meetup.stake_amount);
                strk.transfer(meetup.counterpart, meetup.stake_amount);
            }

            meetup.status = 2; // finalized
            self.meetups.entry(meetup_id).write(meetup);

            self
                .emit(
                    MeetupFinalized {
                        meetup_id,
                        both_attended: creator_in && counterpart_in,
                        creator_attended: creator_in,
                        counterpart_attended: counterpart_in,
                    },
                );
        }

        fn get_meetup(self: @ContractState, meetup_id: u64) -> MeetupData {
            self.meetups.entry(meetup_id).read()
        }

        fn get_meetup_count(self: @ContractState) -> u64 {
            self.meetup_count.read()
        }

        fn get_user_meetups(self: @ContractState, user: ContractAddress) -> Array<u64> {
            let len = self.user_meetup_ids.entry(user).len();
            let mut result: Array<u64> = array![];
            let mut i: u64 = 0;
            loop {
                if i >= len {
                    break;
                }
                result.append(self.user_meetup_ids.entry(user).at(i).read());
                i += 1;
            };
            result
        }
    }
}
