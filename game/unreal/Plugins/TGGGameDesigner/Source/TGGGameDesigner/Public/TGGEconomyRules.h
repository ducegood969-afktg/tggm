#pragma once

#include <cstdint>
#include <limits>

// Integer dollars. No engine dependency, so transaction boundaries can be
// exercised before the Unreal toolchain is available.
namespace TGGEconomyRules
{
inline bool PurchaseBalance(std::int32_t Cash, std::int32_t Cost,
    bool AlreadyOwned, std::int32_t& Result)
{
    if (Cash < 0 || Cost <= 0 || AlreadyOwned || Cash < Cost)
    {
        return false;
    }
    Result = Cash - Cost;
    return true;
}

inline bool CreditBalance(std::int32_t Cash, std::int32_t Revenue,
    std::int32_t& Result)
{
    if (Cash < 0 || Revenue < 0
        || Revenue > (std::numeric_limits<std::int32_t>::max)() - Cash)
    {
        return false;
    }
    Result = Cash + Revenue;
    return true;
}

inline bool ValidMissionState(std::int32_t Stage, std::int32_t Cash)
{
    return Stage >= 0 && Stage <= 2 && Cash >= 0;
}
}
