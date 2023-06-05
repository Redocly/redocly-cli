const UniqueSchemaName = function UniqueSchemaName() {
  return {};
};
const id = 'getyourguide';

const rules = {
  oas3: {
    'unique-schema-name': UniqueSchemaName,
  },
};

module.exports = {
  id,
  rules,
};
