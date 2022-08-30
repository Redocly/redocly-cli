export const firstDocument = {
  openapi: '3.0.0',
  servers: [{ url: 'http://localhost:8080' }],
  info: {
    description: 'example test',
    version: '1.0.0',
    title: 'Swagger Petstore',
    termsOfService: 'http://swagger.io/terms/',
    license: {
      name: 'Apache 2.0',
      url: 'http://www.apache.org/licenses/LICENSE-2.0.html',
    },
  },
  paths: {
    '/GETUser/{userId}': {
      summary: 'get user by id',
      description: 'user info',
      servers: [{ url: '/user' }, { url: '/pet', description: 'pet server' }],

      get: {
        tags: ['pet'],
        summary: 'Find pet by ID',
        description: 'Returns a single pet',
        operationId: 'getPetById',
        servers: [{ url: '/pet' }],
      },
      parameters: [{ name: 'param1', in: 'header', schema: { description: 'string' } }],
    },
  },
  components: {},
};

export const secondDocument = {
  openapi: '3.0.0',
  servers: [{ url: 'http://localhost:8080' }],
  info: {
    description: 'example test',
    version: '1.0.0',
    title: 'Swagger Petstore',
    termsOfService: 'http://swagger.io/terms/',
    license: {
      name: 'Apache 2.0',
      url: 'http://www.apache.org/licenses/LICENSE-2.0.html',
    },
  },
  post: {
    '/GETUser/{userId}': {
      summary: 'get user',
      description: 'user information',
      servers: [{ url: '/user' }, { url: '/pet', description: '' }],

      get: {
        tags: ['pet'],
        summary: 'Find pet by ID',
        description: 'Returns a single pet',
        operationId: 'getPetById',
        servers: [{ url: '/pet' }],
      },
      parameters: [{ name: 'param1', in: 'header', schema: { description: 'string' } }],
    },
  },
  components: {},
};
