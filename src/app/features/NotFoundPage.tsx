import EmptyState from '../components/EmptyState';
import { ButtonLink } from '../components/Button';
import { th } from '../i18n/th';
import { ROUTES } from '../routes';

export default function NotFoundPage() {
  return (
    <EmptyState title={th.notFound.title}>
      <ButtonLink to={ROUTES.listings}>{th.notFound.back}</ButtonLink>
    </EmptyState>
  );
}
