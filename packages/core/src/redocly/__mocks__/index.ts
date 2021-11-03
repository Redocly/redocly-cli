export const __redoclyClient = {
  hasToken: jest.fn(() => false),
};

export const RedoclyClient = jest.fn(() => __redoclyClient);
