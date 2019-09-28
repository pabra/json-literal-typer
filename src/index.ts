import inspect from './analyze';
import jsonify from './jsonify';
import typify from './typify';

function analyze(data: unknown) {
  return inspect(data, null, 'root');
}

export default analyze;
export { jsonify, typify };
