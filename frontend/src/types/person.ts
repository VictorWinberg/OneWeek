export type PersonId = 'annie' | 'victor' | 'annie-victor' | 'lillen' | 'familjen';

export interface Person {
  id: PersonId;
  name: string;
  color: string;
  initial: string;
}

export const PERSONS: Record<PersonId, Person> = {
  annie: {
    id: 'annie',
    name: 'Annie',
    color: 'var(--color-annie)',
    initial: 'A',
  },
  victor: {
    id: 'victor',
    name: 'Victor',
    color: 'var(--color-victor)',
    initial: 'V',
  },
  'annie-victor': {
    id: 'annie-victor',
    name: 'Annie & Victor',
    color: 'var(--color-annie-victor)',
    initial: 'A&V',
  },
  lillen: {
    id: 'lillen',
    name: 'Lillen',
    color: 'var(--color-lillen)',
    initial: 'L',
  },
  familjen: {
    id: 'familjen',
    name: 'Familjen',
    color: 'var(--color-familjen)',
    initial: 'F',
  },
};

export const PERSON_LIST: Person[] = Object.values(PERSONS);

