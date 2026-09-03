'use client';

import { buttonStyles } from '@/components/tailgrids/core/button';
import { CollapsibleGroup } from '@/components/tailgrids/core/collapsible';
import { cn } from '@/utils/cn';
import { Logo, LogoWithText, LogoWithTextDark } from '@/utils/icon';
import { useTheme } from 'next-themes';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useMemo, useState } from 'react';
import type { Key } from 'react-aria-components';
import { NAV_DATA } from './data';
import { CloseIcon, SidebarExpandedIcon, ThreeDots } from './icon';
import NavItem from './nav-item';
import { findActiveGroupKey } from './utils';
import { useAuth, can } from '@/services/spine/auth-context';
import { useModuleExtensions } from '@/services/spine/module-extensions';

export default function Sidebar({
    isSidebarOpen,
    toggleSidebar,
    isMobileSheet = false,
    onItemClick,
}: {
    isSidebarOpen: boolean;
    toggleSidebar: () => void;
    isMobileSheet?: boolean;
    onItemClick?: () => void;
}) {
    const pathname = usePathname();
    const { theme } = useTheme();
    const { token, user } = useAuth();
    const { data: ext } = useModuleExtensions();
    const modules = [...(ext?.menu ?? [])].sort(
        (a, b) => (a.position ?? 999) - (b.position ?? 999),
    );

    // Section ADMIN (non-modul): Users & Roles — tampil sesuai permission.
    const canViewUsers = can(user, 'users:view');
    const canViewRoles = can(user, 'roles:view');
    // Settings (konfigurasi sistem, schema-driven) — permission murni.
    const canViewSettings = can(user, 'settings:view');
    const adminItems = [
        canViewUsers && { key: 'users', label: 'Users', href: '/users' },
        canViewRoles && { key: 'roles', label: 'Roles & Permission', href: '/roles' },
    ].filter(Boolean) as { key: string; label: string; href: string }[];

    // Compute which group should be open based on the current route
    const activeGroupKey = useMemo(
        () => findActiveGroupKey(pathname),
        [pathname],
    );

    const [expandedKeys, setExpandedKeys] = useState<Set<Key>>(
        () => new Set<Key>(activeGroupKey ? [activeGroupKey] : []),
    );

    return (
        <div className='flex h-full flex-col overflow-hidden'>
            {/* Header */}
            <div
                className={cn(
                    'flex items-center px-4 pt-7 text-text-primary',
                    isSidebarOpen
                        ? 'justify-between'
                        : 'flex-col justify-center gap-4',
                )}
            >
                <Link href='/'>
                    {isSidebarOpen ? (
                        <>
                            {theme === 'light' ? (
                                <LogoWithText />
                            ) : (
                                <LogoWithTextDark />
                            )}
                        </>
                    ) : (
                        <Logo />
                    )}
                </Link>

                <button
                    onClick={() => toggleSidebar()}
                    className={cn(
                        'p-1.5 transition-colors',
                        isMobileSheet
                            ? 'rounded-lg text-icon-tertiary hover:bg-background-gray-primary hover:text-text-primary'
                            : 'text-icon-tertiary hover:text-text-secondary',
                    )}
                    aria-label={
                        isMobileSheet ? 'Close sidebar' : 'Toggle sidebar'
                    }
                >
                    {isMobileSheet ? <CloseIcon /> : <SidebarExpandedIcon />}
                </button>
            </div>

            {/* Navigation */}
            <nav
                className={cn(
                    'scrollbar-thin flex-1 overflow-y-auto',
                    isSidebarOpen ? 'mt-7 space-y-6 px-4' : 'mt-5 px-2',
                )}
            >
                <CollapsibleGroup
                    expandedKeys={expandedKeys}
                    onExpandedChange={setExpandedKeys}
                >
                    {NAV_DATA.map((section) => (
                        <div key={section.label}>
                            {/* Expanded: show section label | Collapsed: show divider between sections */}
                            {isSidebarOpen ? (
                                <p className='mt-6 mb-4 text-xs text-text-tertiary uppercase'>
                                    {section.label}
                                </p>
                            ) : (
                                section.label && (
                                    <span className='flex items-center justify-center pt-6 pb-4 text-icon-secondary'>
                                        <ThreeDots />
                                    </span>
                                )
                            )}

                            <div
                                className={cn(
                                    'space-y-1',
                                    !isSidebarOpen && 'space-y-1.5',
                                )}
                            >
                                {section.items.map((item) => (
                                    <NavItem
                                        key={item.title}
                                        id={item.title}
                                        icon={item.icon}
                                        label={item.title}
                                        href={item.url}
                                        items={item.items}
                                        collapsed={!isSidebarOpen}
                                        onItemClick={onItemClick}
                                    />
                                ))}
                            </div>
                        </div>
                    ))}

                    {/* Admin (Users/Roles) — non-modul, tampil sesuai permission */}
                    {token && adminItems.length > 0 && (
                        <div>
                            {isSidebarOpen ? (
                                <p className='mt-6 mb-4 text-xs text-text-tertiary uppercase'>
                                    ADMIN
                                </p>
                            ) : (
                                <span className='flex items-center justify-center pt-6 pb-4 text-icon-secondary'>
                                    <ThreeDots />
                                </span>
                            )}
                            <div className={cn('space-y-1', !isSidebarOpen && 'space-y-1.5')}>
                                {adminItems.map((item) => (
                                    <NavItem
                                        key={item.key}
                                        id={item.label}
                                        label={item.label}
                                        href={item.href}
                                        items={[]}
                                        collapsed={!isSidebarOpen}
                                        onItemClick={onItemClick}
                                    />
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Modul Spine (extensions) — muncul saat login */}
                    {token && (
                        <div>
                            {modules.length > 0 && (
                                <>
                                    {isSidebarOpen ? (
                                        <p className='mt-6 mb-4 text-xs text-text-tertiary uppercase'>
                                            MODULES
                                        </p>
                                    ) : (
                                        <span className='flex items-center justify-center pt-6 pb-4 text-icon-secondary'>
                                            <ThreeDots />
                                        </span>
                                    )}
                                </>
                            )}
                            <div className={cn('space-y-1', !isSidebarOpen && 'space-y-1.5')}>
                                {modules.map((m) => (
                                    <NavItem
                                        key={m.slug}
                                        id={m.label}
                                        icon={
                                            m.icon ? (
                                                <span className='text-base'>{m.icon}</span>
                                            ) : undefined
                                        }
                                        label={m.label}
                                        href={m.href}
                                        items={[]}
                                        collapsed={!isSidebarOpen}
                                        onItemClick={onItemClick}
                                    />
                                ))}
                                {canViewSettings && (
                                    <NavItem
                                        key='settings'
                                        id='Settings'
                                        label='Settings'
                                        href='/settings'
                                        items={[]}
                                        collapsed={!isSidebarOpen}
                                        onItemClick={onItemClick}
                                    />
                                )}
                            </div>
                        </div>
                    )}
                </CollapsibleGroup>
            </nav>

            {/* Footer — only visible when expanded */}
            {isSidebarOpen && (
                <div className='px-4 py-4'>
                    <div className='rounded-2xl bg-background-gray-primary px-4 py-5 text-center'>
                        <p className='mb-2 leading-6 font-semibold text-text-primary'>
                            Upgrade to Pro
                        </p>
                        <small className='text-sm leading-5 tracking-[-0.15px] text-text-tertiary'>
                            Get all dashboard and 200+ essential UI elements
                        </small>
                        <Link
                            href='https://nextadmin.co/pricing'
                            className={buttonStyles({
                                size: 'lg',
                                className: 'mt-4 h-10 w-full bg-brand-500',
                            })}
                            target='_blank'
                            rel='noopener noreferrer'
                        >
                            Upgrade to Pro
                        </Link>
                    </div>
                </div>
            )}
        </div>
    );
}
