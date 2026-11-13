import { useMutation } from '@tanstack/react-query';
import { downloadRespondentReport } from '../../../api/disc/reports';

export function useDownloadRespondentReport() {
  return useMutation({ mutationFn: downloadRespondentReport });
}
