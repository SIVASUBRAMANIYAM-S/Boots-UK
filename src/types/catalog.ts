export type Category = {
  id: string;
  name: string;
  image_url: string | null;
};

export type Product = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  currency: string;
  image_url: string | null;
  category_id: string | null;
  stock_quantity: number;
  is_active: boolean;
};

export type ProductWithCategory = Product & {
  category: Pick<Category, 'id' | 'name'> | null;
};

export type UserProfile = {
  full_name: string | null;
  loyalty_points: number;
};
