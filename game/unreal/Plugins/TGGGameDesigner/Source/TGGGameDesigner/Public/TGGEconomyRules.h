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

inline bool CollectAvailableDay(std::int32_t Cash, std::int32_t Revenue,
    std::int32_t Day, std::int32_t LastCollected, std::int32_t& Result)
{
    return Day > 0 && LastCollected >= -1 && Day > LastCollected
        && CreditBalance(Cash, Revenue, Result);
}

inline bool CloseBusinessDay(std::int32_t Cash, std::int32_t Revenue,
    std::int32_t CurrentDay, std::int32_t LastCollected,
    std::int32_t& NewCash, std::int32_t& NewDay)
{
    std::int32_t CandidateDay = 0;
    std::int32_t CandidateCash = 0;
    if (LastCollected < -1 || LastCollected > CurrentDay
        || !CreditBalance(CurrentDay, 1, CandidateDay)
        || !CollectAvailableDay(Cash, Revenue, CandidateDay,
            LastCollected, CandidateCash))
    {
        return false;
    }
    NewCash = CandidateCash;
    NewDay = CandidateDay;
    return true;
}
}
