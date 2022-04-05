import { ResolvedLintRawConfig } from "../config"
import { getRawConfigWithMergedByPriority } from "../load"

describe('get raw config with merged rules by priority', () => {

  it('should priority rule in root config', () => {
    const input: ResolvedLintRawConfig = {
      "rules": {
        "tags-alphabetical": "warn"
      },
      "extends": [
        {
          "rules": {
            "tags-alphabetical": "off"
          },
        },
        {
          "rules": {
            "tags-alphabetical": "error"
          }
        }
      ],
    }

    const result = {
      "extends": [],
      "rules": {
        "tags-alphabetical": "warn"
      }
    }

    expect(getRawConfigWithMergedByPriority(input)).toEqual(result)
  })

  it('should merge rules and priority rule in last config', () => {
    const input: ResolvedLintRawConfig = {
      "extends": [
        {
          "rules": {
            "tags-alphabetical": "error"
          }
        },
        {
          "rules": {
            "tags-alphabetical": "off"
          }
        },
      ],
      "rules": {
        "no-unresolved-refs": "warn"
      }
    }

    const result = {
      "extends": [],
      "rules": {
        "no-unresolved-refs": "warn",
        "tags-alphabetical": "off"
      }
    }

    expect(getRawConfigWithMergedByPriority(input)).toEqual(result)
  })

})