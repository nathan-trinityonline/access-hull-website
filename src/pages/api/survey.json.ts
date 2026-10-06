// The survey's questions and ward list, for api/survey.php to check answers against.
import survey from '../../data/survey.json';
import wards from '../../data/wards.json';

export const GET = () =>
  new Response(JSON.stringify({ ...survey, wards: [...wards, ...survey.extra_wards] }), {
    headers: { 'Content-Type': 'application/json' },
  });
