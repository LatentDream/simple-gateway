import { useLocation } from 'react-router-dom';
import { Link } from 'react-router-dom';
import { Breadcrumb, BreadcrumbList, BreadcrumbItem, BreadcrumbPage, BreadcrumbSeparator } from '@/components/ui/breadcrumb';

export const prettifyProjectName = (name: string) => {
  return name
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

export default function NavBreadcrumb() {
  const location = useLocation();

  const getPageTitle = () => {
    const path = location.pathname;
    const segments = path.split('/').filter(Boolean);
    if (segments.length === 0) return "Dashboard";

    // Get the last segment
    const lastSegment = segments[segments.length - 1];
    return prettifyProjectName(lastSegment);
  };

  const getBreadcrumbItems = () => {
    const segments = location.pathname.split('/').filter(Boolean);
    const items = [];

    if (location.pathname === '/') {
      items.push(
        <BreadcrumbItem key="Dashboard">
          <BreadcrumbPage>Dashboard</BreadcrumbPage>
        </BreadcrumbItem>
      );
    } else {
      for (let i = 0; i < segments.length - 1; i++) {
        items.push(
          <BreadcrumbItem key={segments[i]}>
            <Link to="/">
              {segments[i].charAt(0).toUpperCase() + segments[i].slice(1)}
            </Link>
          </BreadcrumbItem>
        );
      }

      // Add the current page
      items.push(
        <BreadcrumbItem key="current">
          <BreadcrumbSeparator className="hidden md:block" />
          <BreadcrumbPage className="line-clamp-1">
            {getPageTitle()}
          </BreadcrumbPage>
        </BreadcrumbItem>
      );
    }

    return items;
  };

  return (
    <Breadcrumb>
      <BreadcrumbList>
        {getBreadcrumbItems()}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
