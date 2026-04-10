import { AuthProvider } from '@/context/AuthContext';
import { WorkoutProvider } from '@/context/WorkoutContext';
import { Viewport } from '@/components/Viewport';

export default function Home() {
  return (
    <AuthProvider>
      <WorkoutProvider>
        <Viewport />
      </WorkoutProvider>
    </AuthProvider>
  );
}
