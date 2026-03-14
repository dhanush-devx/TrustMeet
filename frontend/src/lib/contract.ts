// TrustMeet Contract Configuration
export const TRUSTMEET_ADDRESS =
  '0x035a81484dac4573f9c74bbea2fa8c6168f892fb325f082648ae7f56d5169944' as `0x${string}`;

export const STRK_ADDRESS =
  '0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d' as `0x${string}`;

export const STRK_DECIMALS = 18;

export const TRUSTMEET_ABI = [
  {
    type: 'function',
    name: 'create_meetup',
    inputs: [
      { name: 'title', type: 'core::felt252' },
      { name: 'lat', type: 'core::integer::u64' },
      { name: 'lng', type: 'core::integer::u64' },
      { name: 'meetup_time', type: 'core::integer::u64' },
      { name: 'stake_amount', type: 'core::integer::u256' },
      { name: 'counterpart', type: 'core::starknet::contract_address::ContractAddress' },
    ],
    outputs: [{ type: 'core::integer::u64' }],
    state_mutability: 'external',
  },
  {
    type: 'function',
    name: 'join_meetup',
    inputs: [{ name: 'meetup_id', type: 'core::integer::u64' }],
    outputs: [],
    state_mutability: 'external',
  },
  {
    type: 'function',
    name: 'checkin',
    inputs: [
      { name: 'meetup_id', type: 'core::integer::u64' },
      { name: 'lat', type: 'core::integer::u64' },
      { name: 'lng', type: 'core::integer::u64' },
    ],
    outputs: [],
    state_mutability: 'external',
  },
  {
    type: 'function',
    name: 'finalize_meetup',
    inputs: [{ name: 'meetup_id', type: 'core::integer::u64' }],
    outputs: [],
    state_mutability: 'external',
  },
  {
    type: 'function',
    name: 'get_meetup',
    inputs: [{ name: 'meetup_id', type: 'core::integer::u64' }],
    outputs: [
      {
        type: 'trustmeet::MeetupData',
      },
    ],
    state_mutability: 'view',
  },
  {
    type: 'function',
    name: 'get_meetup_count',
    inputs: [],
    outputs: [{ type: 'core::integer::u64' }],
    state_mutability: 'view',
  },
  {
    type: 'function',
    name: 'get_user_meetups',
    inputs: [
      { name: 'user', type: 'core::starknet::contract_address::ContractAddress' },
    ],
    outputs: [{ type: 'core::array::Array::<core::integer::u64>' }],
    state_mutability: 'view',
  },
  {
    type: 'struct',
    name: 'trustmeet::MeetupData',
    members: [
      { name: 'creator', type: 'core::starknet::contract_address::ContractAddress' },
      { name: 'counterpart', type: 'core::starknet::contract_address::ContractAddress' },
      { name: 'lat', type: 'core::integer::u64' },
      { name: 'lng', type: 'core::integer::u64' },
      { name: 'meetup_time', type: 'core::integer::u64' },
      { name: 'stake_amount', type: 'core::integer::u256' },
      { name: 'status', type: 'core::integer::u8' },
      { name: 'creator_checked_in', type: 'core::bool' },
      { name: 'counterpart_checked_in', type: 'core::bool' },
      { name: 'title', type: 'core::felt252' },
    ],
  },
  {
    type: 'event',
    name: 'trustmeet::TrustMeet::Event',
    kind: 'enum',
    variants: [
      { name: 'MeetupCreated', type: 'trustmeet::TrustMeet::MeetupCreated', kind: 'nested' },
      { name: 'MeetupJoined', type: 'trustmeet::TrustMeet::MeetupJoined', kind: 'nested' },
      { name: 'CheckedIn', type: 'trustmeet::TrustMeet::CheckedIn', kind: 'nested' },
      { name: 'MeetupFinalized', type: 'trustmeet::TrustMeet::MeetupFinalized', kind: 'nested' },
    ],
  },
] as const;

export const ERC20_ABI = [
  {
    type: 'function',
    name: 'approve',
    inputs: [
      { name: 'spender', type: 'core::starknet::contract_address::ContractAddress' },
      { name: 'amount', type: 'core::integer::u256' },
    ],
    outputs: [{ type: 'core::bool' }],
    state_mutability: 'external',
  },
  {
    type: 'function',
    name: 'balanceOf',
    inputs: [{ name: 'account', type: 'core::starknet::contract_address::ContractAddress' }],
    outputs: [{ type: 'core::integer::u256' }],
    state_mutability: 'view',
  },
  {
    type: 'function',
    name: 'allowance',
    inputs: [
      { name: 'owner', type: 'core::starknet::contract_address::ContractAddress' },
      { name: 'spender', type: 'core::starknet::contract_address::ContractAddress' },
    ],
    outputs: [{ type: 'core::integer::u256' }],
    state_mutability: 'view',
  },
] as const;
