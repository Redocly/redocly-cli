import { createFaker } from '../faker.js';

describe('faker', () => {
  const faker = createFaker();

  it('should return a faker object', () => {
    expect(faker).toBeDefined();
  });

  it('should return a faker object with address', () => {
    expect(faker.address).toBeDefined();
  });

  it('should return a faker object with date', () => {
    expect(faker.date).toBeDefined();
  });

  it('should return a faker object with number', () => {
    expect(faker.number).toBeDefined();
  });

  it('should return a faker object with string', () => {
    expect(faker.string).toBeDefined();
  });

  describe('address', () => {
    it('should return a city', () => {
      expect(faker.address.city()).toBeDefined();
    });

    it('should return a country', () => {
      expect(faker.address.country()).toBeDefined();
    });

    it('should return a zipCode', () => {
      expect(faker.address.zipCode()).toBeDefined();
    });

    it('should return a street', () => {
      expect(faker.address.street()).toBeDefined();
    });
  });

  describe('date', () => {
    it('should return a past date', () => {
      expect(faker.date.past()).toBeDefined();
    });

    it('should return a future date', () => {
      expect(faker.date.future()).toBeDefined();
    });
  });

  describe('number', () => {
    it('should return an integer', () => {
      expect(faker.number.integer()).toBeDefined();
    });

    it('should return a float', () => {
      expect(faker.number.float()).toBeDefined();
    });

    it('should span min..min + 99999 when only min is given', () => {
      const integer = faker.number.integer({ min: 100_000 });
      expect(integer).toBeGreaterThanOrEqual(100_000);
      expect(integer).toBeLessThanOrEqual(199_999);
    });

    it('should round a float to two decimals unless precision is given', () => {
      const twoDecimals = faker.number.float({ min: 1, max: 2 });
      expect(twoDecimals).toBe(Number(twoDecimals.toFixed(2)));

      expect(faker.number.float({ min: 1, max: 2, precision: 0.5 }) % 0.5).toBe(0);
    });
  });

  describe('string', () => {
    it('should return an email', () => {
      const email = faker.string.email();
      expect(email).toContain('.com');
    });

    it('should return an email with provider and domain', () => {
      const email = faker.string.email({ provider: 'test', domain: 'ua' });
      expect(email).toContain('test.ua');
    });

    it('should return a username', () => {
      expect(faker.string.userName()).toBeDefined();
    });

    it('should return a first name', () => {
      expect(faker.string.firstName()).toBeDefined();
    });

    it('should return a last name', () => {
      expect(faker.string.lastName()).toBeDefined();
    });

    it('should return a full name', () => {
      expect(faker.string.fullName()).toBeDefined();
    });

    it('should return a uuid', () => {
      expect(faker.string.uuid()).toBeDefined();
    });

    it('should return a string', () => {
      expect(faker.string.string()).toBeDefined();
    });
  });
});
