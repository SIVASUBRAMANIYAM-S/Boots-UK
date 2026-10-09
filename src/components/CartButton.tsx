import { CountIconButton } from '@/components/CountIconButton';
import { CartAnimationTarget } from '@/context/CartAnimationContext';

type CartButtonProps = {
  count: number;
  onPress: () => void;
};

export function CartButton({ count, onPress }: CartButtonProps) {
  return (
    <CartAnimationTarget header>
      <CountIconButton icon="🛒" count={count} onPress={onPress} label="Cart" />
    </CartAnimationTarget>
  );
}
