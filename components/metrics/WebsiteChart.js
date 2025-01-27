import React, { useMemo } from 'react';
import classNames from 'classnames';
import { useRouter } from 'next/router';
import PageviewsChart from './PageviewsChart';
import MetricsBar from './MetricsBar';
import WebsiteHeader from './WebsiteHeader';
import DateFilter from 'components/common/DateFilter';
import StickyHeader from 'components/helpers/StickyHeader';
import ErrorMessage from 'components/common/ErrorMessage';
import FilterTags from 'components/metrics/FilterTags';
import useFetch from 'hooks/useFetch';
import useDateRange from 'hooks/useDateRange';
import useTimezone from 'hooks/useTimezone';
import usePageQuery from 'hooks/usePageQuery';
import useLocale from 'hooks/useLocale';
import { getDateArray, getDateLength, getDateRange, getDateRangeValues } from 'lib/date';
import useShareToken from 'hooks/useShareToken';
import { TOKEN_HEADER } from 'lib/constants';
import { get } from 'lib/web';
import styles from './WebsiteChart.module.css';

export default function WebsiteChart({
  websiteId,
  title,
  domain,
  stickyHeader = false,
  showLink = false,
  showChart = true,
  onDataLoad = () => {},
}) {
  const shareToken = useShareToken();
  const [dateRange, setDateRange] = useDateRange(websiteId);
  const { startDate, endDate, unit, value, modified } = dateRange;
  const { locale } = useLocale();
  const [timezone] = useTimezone();
  const { basePath } = useRouter();
  const {
    router,
    resolve,
    query: { url, ref },
  } = usePageQuery();

  const { data, loading, error } = useFetch(
    `/api/website/${websiteId}/pageviews`,
    {
      params: {
        start_at: +startDate,
        end_at: +endDate,
        unit,
        tz: timezone,
        url,
        ref,
      },
      onDataLoad,
      headers: { [TOKEN_HEADER]: shareToken?.token },
    },
    [modified, url, ref],
  );

  const chartData = useMemo(() => {
    if (data) {
      return {
        pageviews: getDateArray(data.pageviews, startDate, endDate, unit),
        sessions: getDateArray(data.sessions, startDate, endDate, unit),
      };
    }
    return { pageviews: [], sessions: [] };
  }, [data, startDate, endDate, unit]);

  function handleCloseFilter(param) {
    router.push(resolve({ [param]: undefined }));
  }

  async function handleDateChange(value) {
    if (value === 'all') {
      const { data, ok } = await get(`${basePath}/api/website/${websiteId}`);
      if (ok) {
        setDateRange({ value, ...getDateRangeValues(new Date(data.created_at), Date.now()) });
      }
    } else if (typeof value === 'string') {
      setDateRange(getDateRange(value, locale));
    } else {
      setDateRange(value);
    }
  }

  return (
    <div className={styles.container}>
      <WebsiteHeader websiteId={websiteId} title={title} domain={domain} showLink={showLink} />
      <div className={classNames(styles.header, 'row')}>
        <StickyHeader
          className={classNames(styles.metrics, 'col row')}
          stickyClassName={styles.sticky}
          enabled={stickyHeader}
        >
          <FilterTags params={{ url, ref }} onClick={handleCloseFilter} />
          <div className="col-12 col-lg-9">
            <MetricsBar websiteId={websiteId} />
          </div>
          <div className={classNames(styles.filter, 'col-12 col-lg-3')}>
            <DateFilter
              value={value}
              startDate={startDate}
              endDate={endDate}
              onChange={handleDateChange}
            />
          </div>
        </StickyHeader>
      </div>
      <div className="row">
        <div className={classNames(styles.chart, 'col')}>
          {error && <ErrorMessage />}
          {showChart && (
            <PageviewsChart
              websiteId={websiteId}
              data={chartData}
              unit={unit}
              records={getDateLength(startDate, endDate, unit)}
              loading={loading}
            />
          )}
        </div>
      </div>
    </div>
  );
}
