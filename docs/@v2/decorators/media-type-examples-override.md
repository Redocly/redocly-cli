# media-type-examples-override

Replaces the request body or response examples in an API description with the contents of a specified file.

## API design principles

Sometimes developers generate OpenAPI and the examples need to be added or improved after the fact.
This generally happens when you have no permission to edit the source.
This decorator provides a way to "overlay" new examples over an API description so that as the API changes, the modifications can be reapplied.
It replaces the whole `examples` section of the given media type for the request body or response status.

## Configuration

| Option       | Type   | Description                                                                                                                                                  |
| ------------ | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| operationIds | object | **REQUIRED.** Object consisting of operationIds as keys, and object as a value that containing the request and responses keys and example`s paths as values. |

An example of a configuration file using the `media-type-examples-override` decorator is shown below:

```yaml
decorators:
  media-type-examples-override:
    operationIds:
      updateSpecialEvent:
        request:
          application/json: ./private-event-examples.yaml
      getMuseumHours:
        responses:
          '200':
            application/json: ./opening-hours-examples.yaml
```

Replace a `requestBody` media type example by using the `request` key in `redocly.yaml`.
The `examples` section in the API description is wholly replaced by the contents of the file you reference.

Replace a response media type example for a specific status by setting `responses` and then the desired status in your configuration file.
The `examples` section for that response status is replaced by the contents of the file specified.
**Note:** Only the `examples` field is replaced; the response status must already exist and be defined in the API description.

## Examples

Given this API description with example:

```yaml
openapi: 3.1.0
info:
  title: Redocly Museum API
  description: An imaginary, but delightful Museum API for interacting with museum services and information. Built with love by Redocly.
  contact:
    url: 'https://redocly.com/docs/cli/'
servers:
  - url: 'https://api.fake-museum-example.com/v1'
paths:
  /museum-hours:
    get:
      summary: Get museum hours
      operationId: getMuseumHours
      responses:
        '200':
          description: Success
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/GetMuseumHoursResponse'
              examples:
                default_example:
                  $ref: '#/components/examples/GetMuseumHoursResponseExample'
        '400':
          description: Bad request
        '404':
          description: Not found
components:
  schemas:
    GetMuseumHoursResponse:
      description: List of museum operating hours for consecutive days.
      type: array
      items:
        $ref: '#/components/schemas/MuseumDailyHours'
    MuseumDailyHours:
      description: Daily operating hours for the museum.
      type: object
      properties:
        date:
          type: string
          description: Date the operating hours apply to.
          example: 2023-12-31
        timeOpen:
          type: string
          description: Time the museum opens on a specific date. Uses 24 hour time format (`HH:mm`).
          example: 09:00
        timeClose:
          description: Time the museum closes on a specific date. Uses 24 hour time format (`HH:mm`).
          type: string
          example: 18:00
    GetMuseumHoursResponseExample:
      summary: Get hours response
      value:
        - date: "2024-06-18"
          timeOpen: "09:00"
          timeClose: "18:00"
        - date: "2024-06-19"
          timeOpen: "09:00"
          timeClose: "18:00"
```

Given the file `./opening-hours-examples.yaml` with content:

```yaml
GetMuseumHoursResponseExampleShort:
  summary: Short-term opening hours
  value:
    - date: "2023-09-11"
      timeOpen: "09:00"
      timeClose: "18:00"
    - date: "2023-09-12"
      timeOpen: "09:00"
      timeClose: "18:00"
GetMuseumHoursResponseExampleClosed:
  summary: The museum is closed
  value: []

```

Given this configuration:

```yaml
decorators:
  remove-unused-components: on
  media-type-examples-override:
    operationIds:
      getMuseumHours:
        responses:
          '200':
            application/json: ./opening-hours-examples.yaml
```

{% admonition type="success" name="Tip" %}
By using the `remove-unused-components` decorator here, the bundle also removes the overwritten example from the components section of the API description.
{% /admonition %}

The result of the bundle command `redocly bundle openapi.yaml`:

```yaml
openapi: 3.1.0
info:
  title: Redocly Museum API
  description: An imaginary, but delightful Museum API for interacting with museum services and information. Built with love by Redocly.
  contact:
    url: https://redocly.com/docs/cli/
servers:
  - url: https://api.fake-museum-example.com/v1
paths:
  /museum-hours:
    get:
      summary: Get museum hours
      operationId: getMuseumHours
      responses:
        '200':
          description: Success
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/GetMuseumHoursResponse'
              examples:
                GetMuseumHoursResponseExampleShort:
                  summary: Short-term opening hours
                  value:
                    - date: '2023-09-11'
                      timeOpen: '09:00'
                      timeClose: '18:00'
                    - date: '2023-09-12'
                      timeOpen: '09:00'
                      timeClose: '18:00'
                GetMuseumHoursResponseExampleClosed:
                  summary: The museum is closed
                  value: []
        '400':
          description: Bad request
        '404':
          description: Not found
components:
  schemas:
    GetMuseumHoursResponse:
      description: List of museum operating hours for consecutive days.
      type: array
      items:
        $ref: '#/components/schemas/MuseumDailyHours'
    MuseumDailyHours:
      description: Daily operating hours for the museum.
      type: object
      properties:
        date:
          type: string
          description: Date the operating hours apply to.
          example: '2023-12-31'
        timeOpen:
          type: string
          description: Time the museum opens on a specific date. Uses 24 hour time format (`HH:mm`).
          example: '09:00'
        timeClose:
          description: Time the museum closes on a specific date. Uses 24 hour time format (`HH:mm`).
          type: string
          example: '18:00'
```

Use the `media-type-examples-override` decorator to maintain rich example sets in separate YAML or JSON files, and add them to your API description to give more complete or informative examples to your users.

## Related decorators

- [operation-description-override](./operation-description-override.md)
- [tag-description-override](./tag-description-override.md)
- [remove-unused-components](./remove-unused-components.md)

## Resources

- [Decorator source](https://github.com/Redocly/redocly-cli/blob/main/packages/core/src/decorators/common/info-description-override.ts)
