export const REGIONS = ['ДР', 'ЦР', 'ХР', 'ЗР', 'ОФІС'];

export const PERSONNEL_MAPPING = {
  'Канаєва Анна Сергіївна': 'ХР',
  'Денисов Олександр': 'ЦР',
  'Чавунов Роман Олегович': 'ДР',
  'Мороз Иван': 'ЗР',
  'НЕСТЕРЕНКО СЕРГІЙ ВІКТОРОВИЧ': 'ХР'
};

export const PERSONNEL = Object.keys(PERSONNEL_MAPPING);

export const EXPENSE_TYPES = [
  'Смаколики',
  'Інше',
  'KIVI TIME',
  'Громадський транспорт',
  'Навчання',
  'Паливо',
  'Нова Пошта'
];

export const COMPENSATION_PROGRAMS = [
  { name: 'KIVI в кожен дім', rate: 0.5 }
];
