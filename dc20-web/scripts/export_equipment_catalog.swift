import DC20Core
import Foundation

guard CommandLine.arguments.count == 2 else {
  fatalError("Expected one output path")
}

let records: [[String: Any]] = EquipmentCatalog.all.map { item in
  [
    "id": item.id,
    "name": item.name,
    "category": item.category.rawValue,
    "subtype": item.subtype,
    "summary": item.summary,
    "mechanics": item.mechanics,
    "properties": item.properties,
    "slot": item.slot.rawValue,
    "sourcePage": item.sourcePage,
  ]
}

var data = try JSONSerialization.data(withJSONObject: records, options: [.prettyPrinted, .sortedKeys, .withoutEscapingSlashes])
data.append(Data("\n".utf8))
try data.write(to: URL(fileURLWithPath: CommandLine.arguments[1]), options: .atomic)
