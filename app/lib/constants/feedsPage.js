export const DEBOUNCE_MS = 500;

export const WIDGET_TYPE_OPTIONS = [
    { label: "Carousel", value: "carousel" },
    { label: "Grid", value: "grid" },
    { label: "Stories", value: "stories" },
    { label: "Floating", value: "floating" },
];

export const SORT_OPTIONS = [
    {
        label: "Created at",
        key: "createdAt",
        direction: "asc",
        value: "createdAt asc",
        directionLabel: "Ascending",
    },
    {
        label: "Created at",
        key: "createdAt",
        direction: "desc",
        value: "createdAt desc",
        directionLabel: "Descending",
    },
];

export const TABLE_HEADINGS = [
    { title: "Status" },
    { title: "Feed name" },
    { title: "Type" },
    { title: "Videos" },
    { title: "Created" },
    { title: "Actions" },
];

export const STATUS_CHOICES = [
    { label: "Active", value: "active" },
    { label: "Inactive", value: "inactive" },
];  