'use client';

import { useCallback } from 'react';
import { CallData } from 'starknet';
import { useStarkzap } from '@/context/StarkzapContext';
import { TRUSTMEET_ADDRESS, STRK_ADDRESS } from '@/lib/contract';
import { encodeCoords, getCurrentPosition } from '@/lib/gps';
import { parseStrk, stringToFelt } from '@/lib/meetup';

// These hooks mirror useTrustMeet.ts but execute via Starkzap Cartridge wallet.
// All transactions are gasless — users only pay their STRK stake, never gas.

function buildU256(amount: bigint) {
  return { low: amount & ((1n << 128n) - 1n), high: amount >> 128n };
}

export function useStarkzapCreateMeetup() {
  const { wallet } = useStarkzap();

  const createMeetup = useCallback(
    async (params: {
      title: string;
      lat: number;
      lng: number;
      meetupTime: Date;
      stakeAmountStrk: string;
      counterpart: string;
    }) => {
      if (!wallet) throw new Error('Cartridge wallet not connected');

      const { lat, lng } = encodeCoords(params.lat, params.lng);
      const meetupTimeUnix = Math.floor(params.meetupTime.getTime() / 1000);
      const stakeAmount = parseStrk(params.stakeAmountStrk);
      const titleFelt = stringToFelt(params.title);

      const calls = [
        {
          contractAddress: STRK_ADDRESS,
          entrypoint: 'approve',
          calldata: CallData.compile({
            spender: TRUSTMEET_ADDRESS,
            amount: buildU256(stakeAmount),
          }),
        },
        {
          contractAddress: TRUSTMEET_ADDRESS,
          entrypoint: 'create_meetup',
          calldata: CallData.compile({
            title: titleFelt,
            lat,
            lng,
            meetup_time: meetupTimeUnix,
            stake_amount: buildU256(stakeAmount),
            counterpart: params.counterpart,
          }),
        },
      ];

      const tx = await wallet.execute(calls as any);
      await tx.wait();
      return tx;
    },
    [wallet]
  );

  return { createMeetup };
}

export function useStarkzapJoinMeetup() {
  const { wallet } = useStarkzap();

  const joinMeetup = useCallback(
    async (meetupId: number, stakeAmount: bigint) => {
      if (!wallet) throw new Error('Cartridge wallet not connected');

      const calls = [
        {
          contractAddress: STRK_ADDRESS,
          entrypoint: 'approve',
          calldata: CallData.compile({
            spender: TRUSTMEET_ADDRESS,
            amount: buildU256(stakeAmount),
          }),
        },
        {
          contractAddress: TRUSTMEET_ADDRESS,
          entrypoint: 'join_meetup',
          calldata: CallData.compile({ meetup_id: meetupId }),
        },
      ];

      const tx = await wallet.execute(calls as any);
      await tx.wait();
      return tx;
    },
    [wallet]
  );

  return { joinMeetup };
}

export function useStarkzapCheckin() {
  const { wallet } = useStarkzap();

  const checkin = useCallback(
    async (meetupId: number, useMockGPS = true) => {
      if (!wallet) throw new Error('Cartridge wallet not connected');

      const pos = await getCurrentPosition(useMockGPS);
      const { lat, lng } = encodeCoords(pos.lat, pos.lng);

      const call = {
        contractAddress: TRUSTMEET_ADDRESS,
        entrypoint: 'checkin',
        calldata: CallData.compile({ meetup_id: meetupId, lat, lng }),
      };

      const tx = await wallet.execute([call] as any);
      await tx.wait();
      return { tx, position: pos };
    },
    [wallet]
  );

  return { checkin };
}

export function useStarkzapFinalize() {
  const { wallet } = useStarkzap();

  const finalize = useCallback(
    async (meetupId: number) => {
      if (!wallet) throw new Error('Cartridge wallet not connected');

      const call = {
        contractAddress: TRUSTMEET_ADDRESS,
        entrypoint: 'finalize_meetup',
        calldata: CallData.compile({ meetup_id: meetupId }),
      };

      const tx = await wallet.execute([call] as any);
      await tx.wait();
      return tx;
    },
    [wallet]
  );

  return { finalize };
}
