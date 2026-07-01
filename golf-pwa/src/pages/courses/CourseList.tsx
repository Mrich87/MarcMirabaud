import { Link } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db';
import PageHeader from '../../components/PageHeader';

export default function CourseList() {
  const courses = useLiveQuery(() => db.courses.orderBy('name').toArray(), []);

  return (
    <>
      <PageHeader
        title="Parcours"
        action={
          <Link className="btn small" to="/courses/new">
            + Ajouter
          </Link>
        }
      />
      <main className="app-main">
        {courses?.length === 0 && (
          <div className="empty-state">Aucun parcours enregistré. Ajoutes-en un pour commencer.</div>
        )}
        {courses?.map((course) => (
          <Link key={course.id} to={`/courses/${course.id}`} className="card-link">
            <div className="card list-item">
              <div>
                <div className="title">{course.name}</div>
                <div className="subtitle">{course.location || `${course.holes.length} trous`}</div>
              </div>
              <div className="pill">{course.tees.join(', ') || 'Sans départ'}</div>
            </div>
          </Link>
        ))}
      </main>
    </>
  );
}
