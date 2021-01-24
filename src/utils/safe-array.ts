export function safeArray<T>(value: any): T[]
{
    if (Array.isArray(value))
    {
        return value;
    }
    else if (value)
    {
        return [value];
    }
    else
    {
        return [];
    }
}
