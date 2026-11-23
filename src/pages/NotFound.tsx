import { ButtonLink } from '../components/primitives';
import { usePageTitle } from '../hooks/usePageTitle';

export function NotFoundPage() {
  usePageTitle('Page not found');
  return (
    <div className="page page--notfound">
      <div className="col notfound">
        <p className="eyebrow">404</p>
        <h1 className="notfound__title">We couldn’t find that page.</h1>
        <p className="notfound__text">The link may be out of date. These will get you back on track:</p>
        <div className="notfound__actions">
          <ButtonLink to="/" variant="primary">Go to Home</ButtonLink>
          <ButtonLink to="/work" variant="outline">See our work</ButtonLink>
        </div>
      </div>
    </div>
  );
}
