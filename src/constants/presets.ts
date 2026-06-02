import { Choice } from '../types';
import { generateId } from '../utils/id';
import { getColorForIndex } from './colors';

export const PARTY_DESCRIPTIONS: Record<string, string> = {
  'Truth Bomb':        'Answer a deep or juicy question — no dodging!',
  'Dare Time':         'Do a fun dare chosen by the rest of the group.',
  'Rapid Fire':        'Name 5 things in a category in 30 seconds.',
  'Sing It Out':       'Sing any song of your choice for 20 seconds.',
  'Would You Rather?': 'Pick one option and explain your reasoning.',
  'Photo Challenge':   'Take a funny group selfie right now.',
  'Secret Reveal':     'Share an embarrassing or funny memory.',
  'Act It Out':        'Act out a movie title without speaking a word.',
  'Point to Someone':  'Give a dare or question to someone you choose.',
  'Lucky You!':        'Pick anyone in the group to take your next spin.',
  'Karaoke Challenge': 'Sing a song chosen by the group — no excuses!',
  'Dance Move':        'Show your best dance move for 15 seconds.',
  'Compliment Round':  'Give a genuine compliment to someone here.',
  'Impression Guess':  'Do an impression and let others guess who.',
  'Truth or Dare Swap':'Pick someone else to do your challenge instead.',
};

export const DEFAULT_PARTY_CHOICES: Choice[] = Object.entries(PARTY_DESCRIPTIONS).map(
  ([label, description], i) => ({
    id: generateId(),
    label,
    description,
    color: getColorForIndex(i),
  })
);
