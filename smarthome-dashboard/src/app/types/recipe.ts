interface Ingredient { amount: string; unit: string; name: string; }
interface Step       { text: string; }
interface Note       { text: string; }

export interface Recipe {
  id:           string;
  title:        string;
  description?: string;
  image?:       string | null;
  servings:     number;
  prepTime?:    number;
  cookTime?:    number;
  tags:         string[];
  ingredients:  Ingredient[];
  steps:        Step[];
  notes:        Note[];
  url:          string;
  source:       'local' | 'server';
  createdAt:    string;
  updatedAt:    string;
}