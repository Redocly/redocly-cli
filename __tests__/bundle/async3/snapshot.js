info:
  title: Account Service
  version: 1.0.0
  description: This service is in charge of processing user signups
components:
  messages:
    UserSignedUp:
      UserSignedUp:
        payload:
          type: object
          properties:
            displayName:
              type: string
              description: Name of the user
            email:
              type: string
              format: email
              description: Email of the user
asyncapi: 3.0.0
channels:
  userSignedup:
    address: user/signedup
    messages:
      UserSignedUp:
        UserSignedUp:
          payload:
            type: object
            properties:
              displayName:
                type: string
                description: Name of the user
              email:
                type: string
                format: email
                description: Email of the user
operations:
  sendUserSignedup:
    action: send
    channel:
      $ref: '#/channels/userSignedup'
    messages:
      - UserSignedUp:
          payload:
            type: object
            properties:
              displayName:
                type: string
                description: Name of the user
              email:
                type: string
                format: email
                description: Email of the user

bundling simple.yml...
📦 Created a bundle for simple.yml at stdout <test>ms.
