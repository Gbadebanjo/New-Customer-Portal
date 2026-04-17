'use client';
import Navbar from "@/components/ui/Navbar/Navbar";

export default function NavbarComponent({ collapsed, setCollapsed, hovered, setHovered, mobileOpen, setMobileOpen }) {
    return (
        <Navbar
            collapsed={collapsed}
            setCollapsed={setCollapsed}
            hovered={hovered}
            setHovered={setHovered}
            mobileOpen={mobileOpen}
            setMobileOpen={setMobileOpen}
        />
    );
}
