import "server-only";

import { randomInt } from "node:crypto";

const uppercase = "ABCDEFGHJKLMNPQRSTUVWXYZ";
const lowercase = "abcdefghijkmnpqrstuvwxyz";
const digits = "23456789";
const alphabet = uppercase + lowercase + digits;

export function gerarSenhaProvisoria(): string {
  const characters = [
    uppercase[randomInt(uppercase.length)],
    lowercase[randomInt(lowercase.length)],
    digits[randomInt(digits.length)],
  ];

  while (characters.length < 10) {
    characters.push(alphabet[randomInt(alphabet.length)]);
  }

  for (let index = characters.length - 1; index > 0; index -= 1) {
    const swapIndex = randomInt(index + 1);
    [characters[index], characters[swapIndex]] = [characters[swapIndex], characters[index]];
  }

  return characters.join("");
}
