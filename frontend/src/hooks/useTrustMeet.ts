'use client';

import { useCallback } from 'react';
import { useAccount, useSendTransaction, useReadContract } from '@starknet-react/core';
import { TRUSTMEET_ABI, TRUSTMEET_ADDRESS, STRK_ADDRESS } from '@/lib/contract';
import { encodeCoords, getCurrentPosition } from '@/lib/gps';
import { parseStrk, parseMeetupData, stringToFelt } from '@/lib/meetup';
import { CallData, Contract, uint256 } from 'starknet';

function u256Calldata(amount: bigint): [string, string] {
  const encoded = uint256.bnToUint256(amount);
  return [encoded.low.toString(), encoded.high.toString()];
}

export function useCreateMeetup() {
  const { account } = useAccount();
  const { sendAsync } = useSendTransaction({});

  const createMeetup = useCallback(
    async (params: {
      title: string;
      lat: number;
      lng: number;
      meetupTime: Date;
      stakeAmountStrk: string;
      counterpart: string;
    }) => {
      if (!account) throw new Error('Wallet not connected');

      const { lat, lng } = encodeCoords(params.lat, params.lng);
      const meetupTimeUnix = Math.floor(params.meetupTime.getTime() / 1000);
      const stakeAmount = parseStrk(params.stakeAmountStrk);
      const titleFelt = stringToFelt(params.title);
      const [amountLow, amountHigh] = u256Calldata(stakeAmount);
      const approveCall = {
        contractAddress: STRK_ADDRESS,
        entrypoint: 'approve',
        calldata: CallData.compile({
          spender: TRUSTMEET_ADDRESS,
          amount: { low: amountLow, high: amountHigh },
        }),
      };
      const createCall = {
        contractAddress: TRUSTMEET_ADDRESS,
        entrypoint: 'create_meetup',
        calldata: CallData.compile({
          title: titleFelt.toString(),
          lat: lat.toString(),
          lng: lng.toString(),
          meetup_time: meetupTimeUnix.toString(),
          stake_amount: { low: amountLow, high: amountHigh },
          counterpart: params.counterpart,
        }),
      };

      try {
        const approveTx = await sendAsync([approveCall]);
        await account.waitForTransaction(approveTx.transaction_hash);
        return await sendAsync([createCall]);
      } catch (error) {
        const approveTx = await account.execute([approveCall]);
        await account.waitForTransaction(approveTx.transaction_hash);
        return await account.execute([createCall]);
      }
    },
    [account, sendAsync]
  );

  return { createMeetup };
}

export function useJoinMeetup() {
  const { account } = useAccount();
  const { sendAsync } = useSendTransaction({});

  const joinMeetup = useCallback(
    async (meetupId: number, stakeAmount: bigint) => {
      if (!account) throw new Error('Wallet not connected');

      const [amountLow, amountHigh] = u256Calldata(stakeAmount);
      const approveCall = {
        contractAddress: STRK_ADDRESS,
        entrypoint: 'approve',
        calldata: CallData.compile({
          spender: TRUSTMEET_ADDRESS,
          amount: { low: amountLow, high: amountHigh },
        }),
      };
      const joinCall = {
        contractAddress: TRUSTMEET_ADDRESS,
        entrypoint: 'join_meetup',
        calldata: CallData.compile({ meetup_id: meetupId.toString() }),
      };

      try {
        const approveTx = await sendAsync([approveCall]);
        await account.waitForTransaction(approveTx.transaction_hash);
        return await sendAsync([joinCall]);
      } catch (error) {
        const approveTx = await account.execute([approveCall]);
        await account.waitForTransaction(approveTx.transaction_hash);
        return await account.execute([joinCall]);
      }
    },
    [account, sendAsync]
  );

  return { joinMeetup };
}

export function useCheckin() {
  const { account } = useAccount();
  const { sendAsync } = useSendTransaction({});

  const checkin = useCallback(
    async (meetupId: number, useMockGPS = true) => {
      if (!account) throw new Error('Wallet not connected');

      const pos = await getCurrentPosition(useMockGPS);
      const { lat, lng } = encodeCoords(pos.lat, pos.lng);
      const tmContract = new Contract(TRUSTMEET_ABI, TRUSTMEET_ADDRESS, account);

      const call = tmContract.populate('checkin', [meetupId, lat, lng]);
      return { txResult: await sendAsync([call]), position: pos };
    },
    [account, sendAsync]
  );

  return { checkin };
}

export function useFinalizeMeetup() {
  const { account } = useAccount();
  const { sendAsync } = useSendTransaction({});

  const finalize = useCallback(
    async (meetupId: number) => {
      if (!account) throw new Error('Wallet not connected');
      const tmContract = new Contract(TRUSTMEET_ABI, TRUSTMEET_ADDRESS, account);
      const call = tmContract.populate('finalize_meetup', [meetupId]);
      return await sendAsync([call]);
    },
    [account, sendAsync]
  );

  return { finalize };
}

export function useGetMeetup(meetupId: number) {
  const { data, isLoading, error, refetch } = useReadContract({
    abi: TRUSTMEET_ABI,
    address: TRUSTMEET_ADDRESS,
    functionName: 'get_meetup',
    args: [meetupId],
    watch: false,
  });

  const meetup = data ? parseMeetupData(meetupId, data as Record<string, unknown>) : null;
  return { meetup, isLoading, error, refetch };
}

export function useUserMeetups() {
  const { address } = useAccount();

  const { data: meetupIds, isLoading: loadingIds } = useReadContract({
    abi: TRUSTMEET_ABI,
    address: TRUSTMEET_ADDRESS,
    functionName: 'get_user_meetups',
    args: address ? [address] : undefined,
    watch: false,
  });

  return {
    meetupIds: (meetupIds as bigint[]) ?? [],
    isLoading: loadingIds,
  };
}

export function useMeetupCount() {
  const { data } = useReadContract({
    abi: TRUSTMEET_ABI,
    address: TRUSTMEET_ADDRESS,
    functionName: 'get_meetup_count',
    args: [],
    watch: true,
  });
  return { count: data ? Number(data) : 0 };
}
