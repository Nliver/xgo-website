import Image from 'next/image';

// Devicon provides the platform marks, with Linux from Simple Icons.
const brands = {
  apple: 'apple',
  windows: 'windows11',
  debian: 'debian',
  redhat: 'redhat',
  homebrew: 'homebrew',
  linux: 'linux',
} as const;

export function PlatformLogo({ name }: { name: keyof typeof brands }) {
  const monochrome = name === 'apple' || name === 'linux';
  return (
    <Image
      className={monochrome ? 'shrink-0 object-contain dark:invert' : 'shrink-0 object-contain'}
      src={`/logos/platform/${brands[name]}.svg`}
      alt=""
      width={16}
      height={16}
    />
  );
}
