export const DEFAULT_CATEGORIES = [
  { id: crypto.randomUUID(), icon: "restaurant", name: "Food" },
  { id: crypto.randomUUID(), icon: "directions_bus", name: "Transport" },
  { id: crypto.randomUUID(), icon: "shopping_bag", name: "Shopping" },
  { id: crypto.randomUUID(), icon: "receipt_long", name: "Bills" },
  { id: crypto.randomUUID(), icon: "movie", name: "Entertainment" },
  { id: crypto.randomUUID(), icon: "home", name: "Housing" },
  { id: crypto.randomUUID(), icon: "medication", name: "Health" },
  { id: crypto.randomUUID(), icon: "inventory_2", name: "Other" },
];

// Starter categories for money coming IN — distinct from spending
// categories so "real" income (salary, a scholarship disbursement)
// doesn't get mixed in with a friend paying back something you fronted.
export const DEFAULT_INCOME_CATEGORIES = [
  { id: crypto.randomUUID(), icon: "payments", name: "Salary" },
  { id: crypto.randomUUID(), icon: "school", name: "Scholarship" },
  { id: crypto.randomUUID(), icon: "group", name: "Friend transfer" },
  { id: crypto.randomUUID(), icon: "card_giftcard", name: "Other income" },
];
