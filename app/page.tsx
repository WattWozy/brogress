import { WorkoutProvider } from '@/context/WorkoutContext';
import { Viewport } from '@/components/Viewport';

export default function Home() {
  return (
    <WorkoutProvider>
      <Viewport />
    </WorkoutProvider>
  );
}
