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

  float(options: NumberOptions): number;
}

export interface Faker {
  address: FakeAddress;
  date: FakeDate;
  number: FakeNumber;
  string: FakeString;
}

export function createFaker(): Faker {
  const fakeString: FakeString = {
    email: ({ provider, domain = 'com' }: { provider?: string; domain?: string } = {}) =>
      faker.internet.email(undefined, undefined, `${provider}.${domain}`),
    userName: () => faker.internet.userName(),
    firstName: () => faker.name.firstName(),
    lastName: () => faker.name.lastName(),
    fullName: () => faker.name.fullName(),
    uuid: () => faker.datatype.uuid(),
    string: ({ length }: { length?: number } = {}) => faker.datatype.string(length),
  };

  const fakeDate: FakeDate = {
    past: () => faker.date.past(),
    future: () => faker.date.future(),
  };

  const fakeAddress: FakeAddress = {
    city: () => faker.address.city(),
    country: () => faker.address.country(),
    zipCode: () => faker.address.zipCode(),
    street: () => faker.address.street(),
  };

  const fakeNumber: FakeNumber = {
    integer: ({ min, max }: Omit<NumberOptions, 'precision'> = {}) =>
      faker.datatype.number({ min, max, precision: 1 }),
    float: (options: NumberOptions) => faker.datatype.float(options),
  };

  return {
    address: fakeAddress,
    date: fakeDate,
    number: fakeNumber,
    string: fakeString,
  };
}
