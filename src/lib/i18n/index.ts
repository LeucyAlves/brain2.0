import { pt } from "./pt";

// Atualmente fixado em português. No futuro, pode evoluir para gerenciar múltiplos idiomas.
const currentLanguage = "pt";

export function t(key: string): string {
    if (currentLanguage === "pt") {
        return (pt as Record<string, string>)[key] || key;
    }
    return key;
}
