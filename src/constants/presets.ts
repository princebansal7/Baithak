import { Choice } from '../types';
import { generateId } from '../utils/id';
import { getColorForIndex } from './colors';

export const PARTY_DESCRIPTIONS: Record<string, string> = {
  'Truth Bomb':        'Answer a deep or juicy question — no dodging!',
  'Dare Time':         'Do a fun dare chosen by the rest of the group.',
  'Sing It Out':       'Sing a song of your choice for the group for 30 seconds.',
  'Would You Rather?': 'Pick one option and explain your reasoning.',
  'Photo Challenge':   'Take a funny selfie right now and post it on your Instagram Story.',
  'Secret Reveal':     'Share an embarrassing or funny memory.',
  'Act It Out':        'Act out a movie title given by the group — no speaking allowed!',
  'Lucky You!':        'Pick anyone in the group to take your turn.',
  'Dance Move':        'Show your best dance move for 20 seconds.',
  'Compliment Round':  'Give a genuine compliment to someone picked by the group.',
  'Bitching Round':    'Share one thing you dislike about someone picked by the group.',
  'Impression Guess':  'Do an impression and let others guess who it is.',
  'Dare Swap':         'Pick someone else to do your challenge instead.',
  'Phone Hand Over':   'Let the group post a story from your phone.',
  'TED Talk':          'Give a 2 minutes TED talk on any topic the group picks.',
};

export const DEFAULT_PARTY_CHOICES: Choice[] = Object.entries(PARTY_DESCRIPTIONS).map(
  ([label, description], i) => ({
    id: generateId(),
    label,
    description,
    color: getColorForIndex(i),
  })
);
