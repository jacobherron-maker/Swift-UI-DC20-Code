import DC20Core
import Foundation

let sections: [[String: String]] = RuleSection.allCases.map { section in
  ["name": section.rawValue, "pageRange": section.pageRange]
}

let entries: [[String: Any]] = RulesLibrary.entries.map { entry in
  var value: [String: Any] = [
    "id": entry.id,
    "title": entry.title,
    "section": entry.section.rawValue,
    "subsection": entry.subsection,
    "summary": entry.summary,
    "text": entry.text,
    "page": entry.page,
    "kind": entry.kind.rawValue,
    "keywords": entry.keywords,
  ]
  if let characterClass = entry.characterClass { value["characterClass"] = characterClass.rawValue }
  if let subclassName = entry.subclassName { value["subclassName"] = subclassName }
  return value
}

let output: [String: Any] = [
  "source": "DC20 Beta 0.10.5 plus the Psion v2 and Summoner supplements included with DC20Hub",
  "sections": sections,
  "entries": entries,
]
var data = try JSONSerialization.data(withJSONObject: output, options: [.prettyPrinted, .sortedKeys, .withoutEscapingSlashes])
data.append(Data("\n".utf8))
if CommandLine.arguments.count > 1 {
  try data.write(to: URL(fileURLWithPath: CommandLine.arguments[1]), options: .atomic)
} else {
  FileHandle.standardOutput.write(data)
}
