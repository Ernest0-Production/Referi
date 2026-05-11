import type { ReactNode } from "react";

export const REFERRER_COMPENSATION_TOOLTIP: ReactNode = (
  <div className="flex flex-col gap-2 text-left">
    <p className="m-0 leading-snug">
      Сумма, которую автор рефералки получит как вознаграждение за успешную рекомендацию по
      завершении процесса на платформе.
    </p>
    <p className="m-0 leading-snug opacity-95">
      При оплате по заявке деньги удерживаются у платёжного провайдера (защищённая сделка ЮKassa) до
      выполнения условий сделки.
    </p>
  </div>
);

export const VACANCY_APPLICATION_COUNT_TOOLTIP =
  "Количество людей, которые уже запросили рефералку на эту вакансию";
