import DC20Core
import Foundation

guard CommandLine.arguments.count == 2 else {
  fatalError("Expected one output path")
}

let encoder = JSONEncoder()
let encoded = try encoder.encode(MonsterSourceLibrary.all)
let sourceRecords = try JSONSerialization.jsonObject(with: encoded) as! [[String: Any]]
let records: [[String: Any]] = sourceRecords.enumerated().map { monsterIndex, source in
  var monster = source
  monster["id"] = String(format: "DC200000-0000-4000-8000-%012d", monsterIndex + 1)
  let abilities = (source["abilities"] as? [[String: Any]] ?? []).enumerated().map { abilityIndex, sourceAbility in
    var ability = sourceAbility
    ability["id"] = String(format: "DC20A000-0000-4000-8000-%012d", ((monsterIndex + 1) * 100) + abilityIndex + 1)
    return ability
  }
  monster["abilities"] = abilities
  return monster
}
var data = try JSONSerialization.data(withJSONObject: records, options: [.prettyPrinted, .sortedKeys, .withoutEscapingSlashes])
data.append(Data("\n".utf8))
try data.write(to: URL(fileURLWithPath: CommandLine.arguments[1]), options: .atomic)
