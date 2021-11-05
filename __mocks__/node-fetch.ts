export default jest.fn(() => ({
  ok: true,
  json: jest.fn(() => ({})),
}));
