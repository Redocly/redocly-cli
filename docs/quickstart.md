# Redocly OpenAPI CLI quickstart guide

## Before you begin

* Get yourself a [GitHub](https://github.com/) account.
* Install [node.js](https://nodejs.org/en/) on your local computer.

## Step 1 - Install OpenAPI CLI

[Follow these steps to install OpenAPI CLI](./docs/installation.md).

## Step 2 - Clone the openapi-starter project

[openapi-starter](https://github.com/Redocly/openapi-starter) creates a local folder structure that you can use to manage your API definition either as a single file, or in multi-file format. It also places a basic API definition file in the `openapi` root folder for those of you who don't have a definition file but need one to start exploring OpenAPI CLI. You're welcome!

If you have your own definition file, go right ahead and use it.

Go [here](openapi-starter.md) to learn how to clone the `openapi-starter` project and learn more about how it works.

## Step 3 - Prepare your API definition file

In this guide, we use a slightly modified version of [OpenWeatherMap's Current Weather Data API](https://openweathermap.org/current) in all examples. If you want to follow along, copy the YAML below and save it as openweathermap.yaml to your local computer. Otherwise, feel free to use your own API definition file or the dummy file created by `openapi-starter`. Just remember to replace `openweathermap.yaml` with the correct filename in each command.

```
openapi: "3.0.2"
info:
  title: "OpenWeatherMap API"
  description: "Get the current weather, daily forecast for 16 days, and a three-hour-interval forecast for 5 days for your city."
  version: "2.5"
  termsOfService: "https://openweathermap.org/terms"
  contact:
    name: "OpenWeatherMap API"
    url: "https://openweathermap.org/api"
    email: "some_email@gmail.com"
  license:
    name: "CC Attribution-ShareAlike 4.0 (CC BY-SA 4.0)"
    url: "https://openweathermap.org/price"

servers:
- url: "https://api.openweathermap.org/data/2.5"

paths:
  /weather:
    get:
      tags:
      - Current Weather Data
      summary: "Get current weather"
      description: "Call current weather data for one location."
      operationId: CurrentWeatherData
      parameters:
        - $ref: '#/components/parameters/q'
        - $ref: '#/components/parameters/id'
        - $ref: '#/components/parameters/lat'
        - $ref: '#/components/parameters/lon'
        - $ref: '#/components/parameters/zip'
        - $ref: '#/components/parameters/units'
        - $ref: '#/components/parameters/lang'
        - $ref: '#/components/parameters/mode'

      responses:
        "200":
          description: Successful response
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/200'
        "404":
          description: Not found response
          content:
            text/plain:
              schema:
                title: Weather not found
                type: string
                example: Not found
security:
- app_id: []

tags:
  - name: Current Weather Data
    description: "Get current weather details"

externalDocs:
  description: API Documentation
  url: https://openweathermap.org/api

components:

  parameters:
    q:
      name: q
      in: query
      description: "**City name**. *Example: London*."
      schema:
        type: string
    id:
      name: id
      in: query
      description: "**City ID**. *Example: `2172797`*."
      schema:
        type: string

    lat:
      name: lat
      in: query
      description: "**Latitude**. *Example: 35*."
      schema:
        type: string

    lon:
      name: lon
      in: query
      description: "**Longitude**. *Example: 139*."
      schema:
        type: string

    zip:
      name: zip
      in: query
      description: "**Zip code**. Search by zip code. *Example: 78746,us*."
      schema:
        type: string

    units:
      name: units
      in: query
      description: "**Units**. *Example: imperial*."
      schema:
        type: string
        enum: [standard, metric, imperial]
        default: "imperial"

    lang:
      name: lang
      in: query
      description: "**Language**. *Example: en*."
      schema:
        type: string
        enum: [ar, bg, ca, cz, de, el, en, fa, fi, fr, gl, hr, hu, it, ja, kr, la, lt, mk, nl, pl, pt, ro, ru, se, sk, sl, es, tr, ua, vi, zh_cn, zh_tw]
        default: "en"

    mode:
      name: mode
      in: query
      description: "**Mode**. *Example: html*."
      schema:
        type: string
        enum: [json, xml, html]
        default: "json"

  schemas:
    "200":
      title: Successful response
      type: object
      properties:
        coord:
          $ref: '#/components/schemas/Coord'
        weather:
          type: array
          items:
            $ref: '#/components/schemas/Weather'
          description: (more info Weather condition codes)
        base:
          type: string
          description: Internal parameter
          example: cmc stations
        main:
          $ref: '#/components/schemas/Main'
        visibility:
          type: integer
          description: Visibility, meter
          example: 16093
        wind:
          $ref: '#/components/schemas/Wind'
        clouds:
          $ref: '#/components/schemas/Clouds'
        rain:
          $ref: '#/components/schemas/Rain'
        snow:
          $ref: '#/components/schemas/Snow'
        dt:
          type: integer
          description: Time of data calculation, unix, UTC
          format: int32
          example: 1435658272
        sys:
          $ref: '#/components/schemas/Sys'
        id:
          type: integer
          description: City ID
          format: int32
          example: 2172797
        name:
          type: string
          example: Cairns
        cod:
          type: integer
          description: Internal parameter
          format: int32
          example: 200
    Coord:
      title: Coord
      type: object
      properties:
        lon:
          type: number
          description: City geo location, longitude
          example: 145.77000000000001
        lat:
          type: number
          description: City geo location, latitude
          example: -16.920000000000002
    Weather:
      title: Weather
      type: object
      properties:
        id:
          type: integer
          description: Weather condition id
          format: int32
          example: 803
        main:
          type: string
          description: Group of weather parameters (Rain, Snow, Extreme etc.)
          example: Clouds
        description:
          type: string
          description: Weather condition within the group
          example: broken clouds
        icon:
          type: string
          description: Weather icon id
          example: 04n
    Main:
      title: Main
      type: object
      properties:
        temp:
          type: number
          description: 'Temperature. Unit Default: Kelvin, Metric: Celsius, Imperial: Fahrenheit.'
          example: 293.25
        pressure:
          type: integer
          description: Atmospheric pressure (on the sea level, if there is no sea_level or grnd_level data), hPa
          format: int32
          example: 1019
        humidity:
          type: integer
          description: Humidity, %
          format: int32
          example: 83
        temp_min:
          type: number
          description: 'Minimum temperature at the moment. This is deviation from current temp that is possible for large cities and megalopolises geographically expanded (use these parameter optionally). Unit Default: Kelvin, Metric: Celsius, Imperial: Fahrenheit.'
          example: 289.81999999999999
        temp_max:
          type: number
          description: 'Maximum temperature at the moment. This is deviation from current temp that is possible for large cities and megalopolises geographically expanded (use these parameter optionally). Unit Default: Kelvin, Metric: Celsius, Imperial: Fahrenheit.'
          example: 295.37
        sea_level:
          type: number
          description: Atmospheric pressure on the sea level, hPa
          example: 984
        grnd_level:
          type: number
          description: Atmospheric pressure on the ground level, hPa
          example: 990
    Wind:
      title: Wind
      type: object
      properties:
        speed:
          type: number
          description: 'Wind speed. Unit Default: meter/sec, Metric: meter/sec, Imperial: miles/hour.'
          example: 5.0999999999999996
        deg:
          type: integer
          description: Wind direction, degrees (meteorological)
          format: int32
          example: 150
    Clouds:
      title: Clouds
      type: object
      properties:
        all:
          type: integer
          description: Cloudiness, %
          format: int32
          example: 75
    Rain:
      title: Rain
      type: object
      properties:
        3h:
          type: integer
          description: Rain volume for the last 3 hours
          format: int32
          example: 3
    Snow:
      title: Snow
      type: object
      properties:
        3h:
          type: number
          description: Snow volume for the last 3 hours
          example: 6
    Sys:
      title: Sys
      type: object
      properties:
        type:
          type: integer
          description: Internal parameter
          format: int32
          example: 1
        id:
          type: integer
          description: Internal parameter
          format: int32
          example: 8166
        message:
          type: number
          description: Internal parameter
          example: 0.0166
        country:
          type: string
          description: Country code (GB, JP etc.)
          example: AU
        sunrise:
          type: integer
          description: Sunrise time, unix, UTC
          format: int32
          example: 1435610796
        sunset:
          type: integer
          description: Sunset time, unix, UTC
          format: int32
          example: 1435650870

  securitySchemes:
    app_id:
      type: apiKey
      description: "API key to authorize requests. (If you don't have an API key, get one at https://openweathermap.org/. See https://idratherbewriting.com/learnapidoc/docapis_get_auth_keys.html for details.)"
      name: appid
      in: query
```

## Step 4 - Try some basic commands
[Commands](./docs/commands/index.md) are used to run tasks (like splitting up large definition files and putting them back together) and they can also return information (like getting stats about your definition). To get your started, we'll focus on the top four: `lint`, `split`, `bundle` and `preview`.

:::info
If you're working with your own definition file, remember to replace `openweathermap.yaml` with the correct filename in all commands.
:::

:::success Tip
If you're new to command lines, you don't have to include the $ in your command. Just open the node.js command window, make sure the directory where your API definition file is stored is shown in the prompt, type the command then press **Enter**.
:::

### `lint` - Validate your definition file
This command ensures that your definition file's structure is valid (according to the OpenAPI Specification) and contains no errors.

In your node.js terminal, point to the directory where petstore.yaml (or your definition) is located then type the following:

```bash
$ openapi lint openweathermap.yaml
```

You should get this response:

```bash
$ openapi lint openweathermap.yaml
No configurations were defined in extends -- using built in recommended configuration by default.

validating openweathermap.yaml...
openweathermap.yaml: validated in 23ms

Woohoo! Your OpenAPI definition is valid. 🎉
```

That's great, but what happens when `lint` detects errors? To find out, let's introduce an error then check the output.

1. Open `openweathermap.yaml`.
1. Go to line #25: `operationId: CurrentWeatherData`.
1. Change `operationId` to `operationIdentifier`.
1. Save `openweathermap.yaml`.
1. Run `$ openapi lint openweathermap.yaml`.

You should get the following response:

```bash Full listing
validating openweathermap.yaml...
[1] openweathermap.yaml:25:7 at #/paths/~1weather/get/operationIdentifier

Property `operationIdentifier` is not expected here.

23 | summary: "Get current weather"
24 | description: "Call current weather data for one location."
25 | operationIdentifier: CurrentWeatherData
26 | parameters:
27 |   - $ref: '#/components/parameters/q'

Error was generated by the spec rule.

[2] openweathermap.yaml:20:5 at #/paths/~1weather/get/operationId

Operation object should contain `operationId` field.

18 | paths:
19 |   /weather:
20 |     get:
21 |       tags:
22 |       - Current Weather Data

Warning was generated by the operation-operationId rule.

openweathermap.yaml: validated in 31ms

❌ Validation failed with 1 error and 1 warning.
run `openapi lint --generate-ignore-file` to add all problems to the ignore file.
```

You got this response because `lint` uses rules to ensure that your file conforms to what you consider to be 'valid'. OpenAPI CLI ships with a set of built-in rules, but you can also create your own, depending on how closely you want to follow the [OpenAPI Specification](https://spec.openapis.org/oas/latest.html). In our example response above, we can see that there is one error [1] and one warning [2].

**Why you got an error**
Because you changed a property that is strictly defined in the OpenAPI Specification. The linter's built-in [`spec`](./resources/built-in-rules.md#spec) rule will throw an error whenever it finds something that is not defined in the specification. That error in detail:

* [1] openweathermap.yaml:25:7 (the error is somewhere on line 25 near the 7th character).
* Property `operationIdentifier` is not expected here.
* Error was generated by the spec rule (the rule that detected the error).

**Why you received a warning**
The warning results from the error. When you changed the `operationId` property, you also changed the [Operation object](https://spec.openapis.org/oas/latest.html#operation-object) which is a non-negotiable object within the OpenAPI Specification. Since `operationId` is no longer there, the matching built-in rule ([operation-operationId](./resources/built-in-rules.md#operation-operationid)) triggered a warning. That warning in detail:

* [2] openweathermap.yaml:20:5 (the issue is somewhere on line 20 near the 5th character).
* Operation object should contain `operationId` field (there should be a particular field here).
* Warning was generated by the operation-operationId rule (the rule that prompted the warning).

To make your definition valid again:

* Read the warning description to work out what's wrong.
* Check the OpenAPI Specification's defined field names for the [Operation object](https://spec.openapis.org/oas/latest.html#operation-object) (hint: you cannot name it `operationIdentifier`).
* Change it back to `operationId` and you'll fix both the warning and the error because the unexpected `operationIdentifier` property is gone.

To check that everything is correct, run the `lint` command again. If you see the following, congratulations - your definition is valid again!

```bash
$ openapi lint openweathermap.yaml
No configurations were defined in extends -- using built in recommended configuration by default.

validating openweathermap.yaml...
openweathermap.yaml: validated in 23ms

Woohoo! Your OpenAPI definition is valid. 🎉
```

### `split` - Divide your large definition into smaller parts

This command splits a single OpenAPI definition file into its constituent parts, enabling you to follow the multi-file approach to API docs. This approach makes it easier to deal with a definition file that has become too large or complex to manage as a single file. But don't worry, the `bundle` command brings everything back into a single file when you're ready to publish your definition.

For this exercise, move `openweathermap.yaml` into the root `openapi-starter` directory so it sits at the same level as the `openapi` folder.

In your terminal, type the following command (newbies - remember to first change the path to point to the location of openweathermap.yaml!):

```bash
$ openapi split openweathermap.yaml --outDir openweathermap
```

You should get this response:

```bash
Document: openweathermap.yaml is successfully split
  and all related files are saved to the directory: openweathermap

openweathermap.yaml: split processed in 41ms
```

So, what just happened? Take a look in the newly created `openweathermap` directory. That's where the magic is! See how the `split` command automatically broke your single API definition into its constituent parts and very kindly organized them in a new directory called `openweathermap`?

```bash
├── components
│   └── parameters
│       └── id.yaml
│       └── lang.yaml
│       └── lat.yaml
│       └── lon.yaml
│       └── mode.yaml
│       └── q.yaml
│       └── units.yaml
│       └── zip.yaml
│   └── schemas
│       └── 200.yaml
│       └── Clouds.yaml
│       └── Coord.yaml
│       └── Main.yaml
│       └── Rain.yaml
│       └── Snow.yaml
│       └── Sys.yaml
│       └── Weather.yaml
│       └── Wind.yaml
├── paths
│       └── weather.yaml
└── openapi.yaml
```

:::info Note
`openapi.yaml` in the `openweathermap` folder is the default name that Open API CLI gives to the 'master' YAML file you just split up. It contains `$ref`s to its constituent parts. You do the work in the consituent parts, not the master. This is the whole point of splitting up a large API definition. The original `openweathermap.yaml` file sits in the root directory if you ever need it again.
:::

### `bundle` - Pull constituent parts of your definition back into a single file

`bundle` merges standalone files back into a single definition file.

::: info Note
`openweathermap/openapi.yaml` is the location of the master Open Weather Map API definition in our example.
:::

In your terminal, type the following:

```bash
$ openapi bundle openweathermap/openapi.yaml --output bundled.yaml
```

You should get the response below, and you should also see a new `bundled.yaml` file in the root directory:

```bash
bundling openweathermap/openapi.yaml...
📦 Created a bundle for openweathermap/openapi.yaml at bundled.yaml 26ms.
```

Run the `lint` command on `bundled.yaml`. If the  definition is still valid, it means that the `bundle` command did a perfect job.

### `preview-docs` - Quickly preview your definition file

Use `preview-docs` to generate a preview of your API reference docs.

In your terminal, type the following:

```bash
$ openapi preview-docs bundled.yaml
```

You should get this response:

```bash
Using Redoc community edition.
Login with openapi-cli login or use an enterprise license key to preview with the premium docs.

  🔎  Preview server running at http://127.0.0.1:8080

Bundling...

  👀  Watching bundled.yaml and all related resources for changes

Created a bundle for bundled.yaml successfully
```

Open a web browser, navigate to `http://127.0.0.1:8080` and check that your definition file has been served successfully.

This server supports live changes. If you modify the definition file (in our example, `bundled.yaml`), the changes will be visible in the preview straight away. For example, if you change the version from '2.5' to '3.0'...

```bash
openapi: 3.0.2
info:
  title: OpenWeatherMap API
  description: >-
    Get the current weather... etc.
  version: '3.0'
  ...
```

... you should get the following response:

```bash
Bundling...

Created a bundle for bundled.yaml successfully
GET /: 1.968ms
GET /simplewebsocket.min.js: 2.733ms
GET /hot.js: 1.495ms
GET /openapi.json: 0.44ms
GET /favicon.png: 1.836ms
watch changed bundled.yaml
```

Back in `http://127.0.0.1:8080` the update will be visible.

## Now, get into it!

* Take a look at [all of the available OpenAPI CLI commands](./commands/index.md).
* Fine-tune OpenAPI CLI through the awesome magic that is the [config file](./configuration/configuration-file.mdx).
* Get creative and head straight to [custom plugins and rules](./resources/custom-rules.md).