// Mirrors SmartPan's ShoppingListItem (../shoppingList.ts in that repo) so the
// server object is a lossless passthrough of what the phone app already has —
// this is the richer, recipe-integrated model, not a simplified one.
export interface ShoppingItem {
  id: string;
  name: string;
  amount: number | null;
  unit: string;
  checked: boolean;
  recipeTitles: string[];
}

export interface ShoppingNote {
  items: ShoppingItem[];
  updatedAt: string;
}
