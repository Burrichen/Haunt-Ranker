import type { Character } from "../../models/character";
import { Panel } from "../ui";
import "./CharacterGrid.css";

export interface CharacterGridProps {
  characters: Character[];
}

export function CharacterGrid({ characters }: CharacterGridProps) {
  return (
    <div className="character-grid">
      {characters.map((character) => (
        <Panel key={character.id} padding="sm" className="character-grid__item">
          <h3 className="character-grid__name">{character.name}</h3>
          {character.description && (
            <p className="character-grid__description">{character.description}</p>
          )}
        </Panel>
      ))}
    </div>
  );
}
