import { Breadcrumbs, Link, Typography } from '@mui/material';
import { NavLink } from 'react-router';

export interface BreadcrumbItem {
  title: string;
  to?: string;
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
}

const Breadcrumb = ({ items }: BreadcrumbProps) => (
  <Breadcrumbs aria-label="breadcrumb">
    {items.map((item) =>
      item.to ? (
        <Link key={item.title} underline="hover" color="inherit" component={NavLink} to={item.to}>
          {item.title}
        </Link>
      ) : (
        <Typography key={item.title} color="textPrimary">
          {item.title}
        </Typography>
      ),
    )}
  </Breadcrumbs>
);

export default Breadcrumb;
