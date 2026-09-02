import DC20Core
import Foundation

func dictionary(_ values: [(String, Any)]) -> [String: Any] {
  Dictionary(uniqueKeysWithValues: values)
}

let skillGroups = Dictionary(
  uniqueKeysWithValues: CharacterOptions.skillGroups.flatMap { group in
    group.options.map { ($0, group.name) }
  })
let tradeGroups = Dictionary(
  uniqueKeysWithValues: CharacterOptions.tradeGroups.flatMap { group in
    group.options.map { ($0, group.name) }
  })
let languageGroups = Dictionary(
  uniqueKeysWithValues: CharacterOptions.languageGroups.flatMap { group in
    group.options.map { ($0, group.name) }
  })

let skills: [[String: Any]] = SkillLibrary.all.map { item in
  dictionary([
    ("name", item.name),
    ("group", skillGroups[item.name] ?? item.attribute),
    ("attribute", item.attribute),
    ("description", item.description),
  ])
}

let trades: [[String: Any]] = TradeLibrary.all.map { item in
  dictionary([
    ("name", item.name),
    ("group", tradeGroups[item.name] ?? "Trades"),
    ("attribute", item.attribute),
    ("tool", item.tool ?? "None"),
    ("description", item.description),
  ])
}

let languages: [[String: Any]] = LanguageLibrary.all.map { item in
  dictionary([
    ("name", item.name),
    ("group", languageGroups[item.name] ?? "Languages"),
    ("typicalSpeakers", item.typicalSpeakers),
    ("description", item.description),
  ])
}

func ancestryTrait(_ trait: AncestryTrait) -> [String: Any] {
  var result = dictionary([
    ("id", trait.id),
    ("ancestry", trait.ancestry),
    ("category", trait.category),
    ("cost", trait.cost),
    ("name", trait.name),
    ("description", trait.description),
    ("isRepeatable", trait.isRepeatable),
    ("countsAsZeroPointTrait", trait.countsAsZeroPointTrait),
  ])
  if let prerequisite = trait.prerequisite { result["prerequisite"] = prerequisite }
  return result
}

func classRow(_ row: ClassTableRow) -> [String: Any] {
  var result: [String: Any] = ["level": row.level, "features": row.features]
  if let value = row.health { result["health"] = value }
  if let value = row.attribute { result["attribute"] = value }
  if let value = row.skill { result["skill"] = value }
  if let value = row.trade { result["trade"] = value }
  if let value = row.stamina { result["stamina"] = value }
  if let value = row.maneuvers { result["maneuvers"] = value }
  if let value = row.mana { result["mana"] = value }
  if let value = row.cantrips { result["cantrips"] = value }
  if let value = row.spells { result["spells"] = value }
  return result
}

func choiceGroup(_ group: ClassFeatureChoiceGroup) -> [String: Any] {
  var result = dictionary([
    ("id", group.id),
    ("level", group.level),
    ("feature", group.feature),
    ("title", group.title),
    ("prompt", group.prompt),
    ("limit", group.limit),
    ("options", group.options.map { option in
      var value = dictionary([
        ("name", option.name),
        ("description", option.description),
        ("isRepeatable", option.isRepeatable),
        ("pointCost", option.pointCost),
      ])
      if let maximumCount = option.maximumCount { value["maximumCount"] = maximumCount }
      return value
    }),
  ])
  if let subclass = group.requiredSubclass { result["requiredSubclass"] = subclass }
  return result
}

let classes: [[String: Any]] = DC20Class.allCases.map { characterClass in
  let equipment = characterClass.equipment
  let featureProgression = characterClass.completeFeatureProgression.map { level in
    dictionary([
      ("level", level.level),
      ("features", level.features.map { feature in
        dictionary([("name", feature.name), ("description", feature.description)])
      }),
    ])
  }
  let subclassFeatures = Dictionary(
    uniqueKeysWithValues: characterClass.subclassFeatureDetails.map { name, features in
      (name, features.map { feature in
        dictionary([("name", feature.name), ("description", feature.description)])
      })
    })
  let subclasses: [String?] = [nil] + characterClass.subclasses.map(Optional.some)
  var seenChoiceGroups: Set<String> = []
  let choices: [[String: Any]] = subclasses.flatMap { subclass -> [[String: Any]] in
    characterClass.featureChoiceGroups(for: 10, subclass: subclass).compactMap { group -> [String: Any]? in
      let key = "\(group.id)|\(group.requiredSubclass ?? "")"
      guard seenChoiceGroups.insert(key).inserted else { return nil }
      return choiceGroup(group)
    }
  }

  var result = dictionary([
    ("name", characterClass.rawValue),
    ("path", characterClass.path),
    ("summary", characterClass.summary),
    ("description", characterClass.detailedDescription),
    ("baseHP", characterClass.baseHP),
    ("levelOneResource", characterClass.resource),
    ("schoolChoiceCount", characterClass.schoolChoiceCount),
    ("spellsKnownAtLevel1", characterClass.spellsKnownAtLevel1),
    ("maneuversKnownAtLevel1", characterClass.maneuversKnownAtLevel1),
    ("pathTitle", characterClass.initialPathTitle),
    ("pathDetails", characterClass.initialPathDetails),
    ("startingEquipment", dictionary([
      ("arsenal", equipment.arsenal),
      ("arsenalCount", equipment.arsenalCount),
      ("armor", equipment.armor),
      ("tradeTools", equipment.tradeTools),
      ("tradeToolCount", equipment.tradeToolCount),
      ("description", equipment.note),
    ])),
    ("tableSource", characterClass.classTableSourceLabel),
    ("tableColumns", characterClass.classTableColumns.map(\.rawValue)),
    ("tableRows", characterClass.classTableRows.map(classRow)),
    ("features", featureProgression),
    ("subclasses", characterClass.subclasses),
    ("subclassFeatures", subclassFeatures),
    ("talents", characterClass.talentOptions.map { talent in
      dictionary([
        ("name", talent.name),
        ("description", talent.description),
        ("minimumLevel", talent.minimumLevel),
        ("isRepeatable", talent.isRepeatable),
      ])
    }),
    ("choiceGroups", choices),
  ])
  if let fixedSpellSource = characterClass.fixedSpellSource {
    result["fixedSpellSource"] = fixedSpellSource
  }
  return result
}

let output: [String: Any] = [
  "source": "DC20 Beta 0.10.5 plus the Psion v2 and Summoner supplements included with DC20Hub",
  "skillGroups": CharacterOptions.skillGroups.map { ["name": $0.name, "options": $0.options] },
  "tradeGroups": CharacterOptions.tradeGroups.map { ["name": $0.name, "options": $0.options] },
  "languageGroups": CharacterOptions.languageGroups.map { ["name": $0.name, "options": $0.options] },
  "skills": skills,
  "trades": trades,
  "languages": languages,
  "generalAncestryTraits": AncestryLibrary.general.map(ancestryTrait),
  "ancestryTraits": AncestryLibrary.all.map(ancestryTrait),
  "ancestries": CharacterOptions.ancestries,
  "classes": classes,
]

var data = try JSONSerialization.data(
  withJSONObject: output,
  options: [.prettyPrinted, .sortedKeys, .withoutEscapingSlashes])
data.append(Data("\n".utf8))
if CommandLine.arguments.count > 1 {
  try data.write(to: URL(fileURLWithPath: CommandLine.arguments[1]), options: .atomic)
} else {
  FileHandle.standardOutput.write(data)
}
