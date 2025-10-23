// components/BackgroundWrapper.tsx
import { ReactNode } from 'react';
import { Image, View } from 'react-native';
import "@/global.css";


type Props = {
  children: ReactNode;
};

export default function BackgroundWrapper({ children }: Props) {
  return (
    <View className="flex-1 relative justify-center items-center bg-gradient-to-b from-sky-200 via-blue-100 to-white">
      <Image
        source={require('@/assets/images/LTOLOGO.png')}
        resizeMode="cover"
        className="absolute w-[400px] h-[400px] opacity-10"
      />
      <View className="z-10 w-full h-full justify-center items-center">
        {children}
      </View>
    </View>
  );
}
