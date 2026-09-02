import { faker } from '@faker-js/faker';

interface NumberOptions {
  min?: number;
  max?: number;
  precision?: number;
}

interface FakeString {
  email(options?: { provider?: string; domain?: string }): string;

  userName(): string;

  firstName(): string;

  lastName(): string;

  fullName(): string;

  uuid(): string;

  string(options?: { length?: number }): string;
}

interface FakeDate {
  past(): Date;

  future(): Date;
}

interface FakeAddress {
  city(): string;

  country(): string;

  zipCode(): string;

  street(): string;
}

interface FakeNumber {
  integer(options?: Omit<NumberOptions, 'precision'>): number;

  float(options?: NumberOptions): number;
}

export interface Faker {
  address: FakeAddress;
  date: FakeDate;
  number: FakeNumber;
  string: FakeString;
}

// The defaults faker v7 applied to calls without bounds, kept so that upgrading it
// doesn't widen the values Arazzo tests send.
const DEFAULT_RANGE_SIZE = 99999;
const DEFAULT_FLOAT_PRECISION = 0.01;

export function createFaker(): Faker {
  const fakeString: FakeString = {
    email: ({ provider, domain = 'com' }: { provider?: string; domain?: string } = {}) =>
      faker.internet.email(provider ? { provider: `${provider}.${domain}` } : undefined),
    userName: () => faker.internet.username(),
    firstName: () => faker.person.firstName(),
    lastName: () => faker.person.lastName(),
    fullName: () => faker.person.fullName(),
    uuid: () => faker.string.uuid(),
    string: ({ length }: { length?: number } = {}) => faker.string.sample(length),
  };

  const fakeDate: FakeDate = {
    past: () => faker.date.past(),
    future: () => faker.date.future(),
  };

  const fakeAddress: FakeAddress = {
    city: () => faker.location.city(),
    country: () => faker.location.country(),
    zipCode: () => faker.location.zipCode(),
    street: () => faker.location.street(),
  };

  const fakeNumber: FakeNumber = {
    integer: ({ min = 0, max = min + DEFAULT_RANGE_SIZE }: Omit<NumberOptions, 'precision'> = {}) =>
      faker.number.int({ min, max }),
    float: ({
      min = 0,
      max = min + DEFAULT_RANGE_SIZE,
      precision = DEFAULT_FLOAT_PRECISION,
    }: NumberOptions = {}) => faker.number.float({ min, max, multipleOf: precision }),
  };

  return {
    address: fakeAddress,
    date: fakeDate,
    number: fakeNumber,
    string: fakeString,
  };
}
