import Image from 'next/image';
import business from '../config/business.json';

export default function BrandLogo({ size, className = '', eager = false, decorative = false }) {
    const { name, logo } = business.brand;
    const frame = 'shrink-0 rounded-full ' + className;

    return logo ? (
        <Image src={logo} alt={decorative ? '' : name} width={size} height={size} loading={eager ? 'eager' : 'lazy'}
            className={'aspect-square object-contain ' + frame} style={{ width: size, height: size }} />
    ) : (
        <span aria-hidden={decorative || undefined} role={decorative ? undefined : 'img'} aria-label={decorative ? undefined : name}
            className={'grid place-items-center bg-brand-primary font-bold text-brand-on-primary ' + frame}
            style={{ width: size, height: size }}>{name.slice(0, 1)}</span>
    );
}
