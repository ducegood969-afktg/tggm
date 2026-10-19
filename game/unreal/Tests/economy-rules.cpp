#include "TGGEconomyRules.h"
#include <cassert>
#include <iostream>
#include <random>

int main()
{
    using namespace TGGEconomyRules;
    constexpr auto Max = (std::numeric_limits<std::int32_t>::max)();
    std::int32_t Balance = 777;
    assert(!PurchaseBalance(100, -50, false, Balance) && Balance == 777);
    assert(!PurchaseBalance(100, 0, false, Balance) && Balance == 777);
    assert(!PurchaseBalance(100, 101, false, Balance) && Balance == 777);
    assert(!PurchaseBalance(100, 50, true, Balance) && Balance == 777);
    assert(!PurchaseBalance(-1, 1, false, Balance) && Balance == 777);
    assert(PurchaseBalance(100, 100, false, Balance) && Balance == 0);
    assert(PurchaseBalance(Max, 1, false, Balance) && Balance == Max - 1);
    Balance = 777;
    assert(!CreditBalance(Max, 1, Balance) && Balance == 777);
    assert(!CreditBalance(0, -1, Balance) && Balance == 777);
    assert(!CreditBalance(-1, 1, Balance) && Balance == 777);
    assert(CreditBalance(Max - 100, 100, Balance) && Balance == Max);
    assert(CreditBalance(50, 0, Balance) && Balance == 50);
    // Delivery reward adds to an existing balance rather than resetting it.
    assert(CreditBalance(40, 100, Balance) && Balance == 140);
    assert(ValidMissionState(2, 40)); // Completed mission after a purchase.
    assert(ValidMissionState(0, 0));
    assert(!ValidMissionState(3, 100));
    assert(!ValidMissionState(-1, 0));
    assert(!ValidMissionState(2, -1));

    std::mt19937 Random(20261019);
    for (int Index = 0; Index < 100000; ++Index)
    {
        const std::int32_t Cash = static_cast<std::int32_t>(Random() & Max);
        const std::int32_t Cost = static_cast<std::int32_t>(Random() & Max);
        std::int32_t Result = -7;
        const bool Bought = PurchaseBalance(Cash, Cost, false, Result);
        if (Bought)
        {
            assert(Result >= 0 && static_cast<std::int64_t>(Result) + Cost == Cash);
        }
        else { assert(Result == -7); }
        Result = -7;
        const bool Credited = CreditBalance(Cash, Cost, Result);
        const auto Sum = static_cast<std::int64_t>(Cash) + Cost;
        assert(Credited == (Sum <= Max));
        assert(Credited ? Result == Sum : Result == -7);
    }
    std::cout << "Economy boundary cases and 100000 randomized transactions passed.\n";
}
