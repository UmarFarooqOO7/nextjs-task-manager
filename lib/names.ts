const COLORS = ["Red", "Blue", "Green", "Teal", "Gold", "Pink", "Violet", "Amber", "Coral", "Slate"]
const ANIMALS = ["Fox", "Bear", "Wolf", "Hawk", "Lynx", "Deer", "Crane", "Otter", "Raven", "Tiger"]

export function generateName(): string {
  const color = COLORS[Math.floor(Math.random() * COLORS.length)]
  const animal = ANIMALS[Math.floor(Math.random() * ANIMALS.length)]
  return `${color} ${animal}`
}
