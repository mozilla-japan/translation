module.exports = {
  "plugins": [
    "html"
  ],
  "filters": {},
  "rules": {
    "preset-ja-technical-writing": {
      "max-kanji-continuous-len": {
        ...require("./allow-kanji")
      }
    },
    "textlint-rule-ja-space-between-half-and-full-width": {
      "space": "always"
    },
    "prh": {
      "rulePaths": [
        "./prh.yml"
      ]
    }
  }
}
